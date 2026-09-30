import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { Task } from "../api/client";
import { SnoozeDialog } from "../components/SnoozeDialog";
import type { TaskHandlers } from "../components/TaskItem";
import { useTaskActions } from "./useLoopData";
import { notify } from "./useNotices";

const TaskHandlersContext = createContext<TaskHandlers | null>(null);

/** One shared set of task actions and a single snooze dialog for every view. */
export function TaskHandlersProvider({ children }: { children: ReactNode }) {
  const actions = useTaskActions();
  const [snoozing, setSnoozing] = useState<Task | null>(null);

  const handlers = useMemo<TaskHandlers>(
    () => ({
      onUpdate: (id, data) => void actions.update(id, data),
      onDelete: (id) => void actions.remove(id),
      onSnooze: (task) => setSnoozing(task),
      onComplete: (task) => {
        void actions.update(task.id, { status: "done" });
        notify("success", `Done: ${task.text}`, {
          label: "Undo",
          run: () => void actions.update(task.id, { status: task.status }),
        });
      },
    }),
    [actions]
  );

  return (
    <TaskHandlersContext.Provider value={handlers}>
      {children}
      <SnoozeDialog
        task={snoozing}
        onClose={() => setSnoozing(null)}
        onSnooze={(task, until, reason) => {
          void actions.update(task.id, { status: "snoozed", snoozedUntil: until.toISOString(), snoozeReason: reason });
          notify("info", `Snoozed until ${until.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.`);
        }}
      />
    </TaskHandlersContext.Provider>
  );
}

export function useTaskHandlers(): TaskHandlers {
  const handlers = useContext(TaskHandlersContext);
  if (!handlers) throw new Error("useTaskHandlers must be used inside TaskHandlersProvider");
  return handlers;
}
