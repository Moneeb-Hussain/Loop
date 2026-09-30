import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, SessionWithTasks, Task, TaskCategory, TaskUpdate } from "../api/client";
import { notifyError } from "./useNotices";

const TASKS = ["tasks"] as const;
const SESSIONS = ["sessions"] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS, queryFn: () => api.tasks.list() });
}

export function useSessions() {
  return useQuery({ queryKey: SESSIONS, queryFn: () => api.sessions.list() });
}

function applyUpdate(task: Task, data: TaskUpdate): Task {
  return {
    ...task,
    ...(data.status ? { status: data.status } : {}),
    ...(data.urgency ? { urgency: data.urgency } : {}),
    ...(data.text !== undefined ? { text: data.text } : {}),
    ...(data.snoozedUntil ? { snoozed_until: data.snoozedUntil } : {}),
    ...(data.snoozeReason !== undefined ? { snooze_reason: data.snoozeReason } : {}),
    updated_at: new Date().toISOString(),
  };
}

/** Task mutations with optimistic updates so the list reacts instantly. */
export function useTaskActions() {
  const client = useQueryClient();

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: TASKS });
    void client.invalidateQueries({ queryKey: SESSIONS });
  };

  const patchCaches = (fn: (task: Task) => Task | null) => {
    client.setQueryData<Task[]>(TASKS, (tasks) =>
      tasks?.map(fn).filter((task): task is Task => task !== null)
    );
    client.setQueryData<SessionWithTasks[]>(SESSIONS, (sessions) =>
      sessions?.map((session) => ({
        ...session,
        tasks: session.tasks.map(fn).filter((task): task is Task => task !== null),
      }))
    );
  };

  const snapshot = async () => {
    await Promise.all([client.cancelQueries({ queryKey: TASKS }), client.cancelQueries({ queryKey: SESSIONS })]);
    return {
      tasks: client.getQueryData<Task[]>(TASKS),
      sessions: client.getQueryData<SessionWithTasks[]>(SESSIONS),
    };
  };

  const restore = (context?: { tasks?: Task[]; sessions?: SessionWithTasks[] }) => {
    if (!context) return;
    client.setQueryData(TASKS, context.tasks);
    client.setQueryData(SESSIONS, context.sessions);
  };

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) => api.tasks.update(id, data),
    onMutate: async ({ id, data }) => {
      const context = await snapshot();
      patchCaches((task) => (task.id === id ? applyUpdate(task, data) : task));
      return context;
    },
    onError: (error, _vars, context) => {
      restore(context);
      notifyError(error, "Couldn't update that task.");
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onMutate: async (id) => {
      const context = await snapshot();
      patchCaches((task) => (task.id === id ? null : task));
      return context;
    },
    onError: (error, _id, context) => {
      restore(context);
      notifyError(error, "Couldn't delete that task.");
    },
    onSettled: invalidate,
  });

  const create = useMutation({
    mutationFn: (data: { text: string; category: TaskCategory }) => api.tasks.create(data),
    onError: (error) => notifyError(error, "Couldn't add that task."),
    onSettled: invalidate,
  });

  const extract = useMutation({
    mutationFn: (transcript: string) => api.sessions.create(transcript),
    onSettled: invalidate,
  });

  return {
    update: (id: string, data: TaskUpdate) => update.mutateAsync({ id, data }).catch(() => undefined),
    remove: (id: string) => remove.mutateAsync(id).catch(() => undefined),
    create: (data: { text: string; category: TaskCategory }) => create.mutateAsync(data).catch(() => undefined),
    extract: extract.mutateAsync,
    isCreating: create.isPending,
  };
}
