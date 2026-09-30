export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type TaskCategory = "task" | "reminder" | "open_loop";
export type TaskStatus = "open" | "done" | "snoozed";

export interface Task {
  id: string;
  origin_session_id: string | null;
  text: string;
  category: TaskCategory;
  status: TaskStatus;
  urgency: number;
  first_flagged_at: string;
  snoozed_until: string | null;
  snooze_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  raw_transcript: string;
  created_at: string;
}

export interface SessionWithTasks extends Session {
  tasks: Task[];
}

export interface CreateSessionResponse {
  session: Session;
  tasks: Task[];
  degraded: boolean;
}

export interface TaskUpdate {
  status?: TaskStatus;
  urgency?: number;
  text?: string;
  snoozedUntil?: string;
  snoozeReason?: string;
}

export type StreamMessage =
  | { type: "ready" | "Begin" | "SpeechStarted" }
  | { type: "closed"; code?: number; reason?: string }
  | { type: "transcript"; text: string; final: boolean; turnOrder?: number; formatted?: boolean }
  | { type: "error"; message: string };

export function streamUrl(): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/stream-transcript";
  url.search = "";
  return url.toString();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(`Can't reach the Loop backend at ${API_URL}. Is it running?`, 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Zod validation errors come back as { formErrors, fieldErrors } objects.
    const detail = typeof body.error === "string" ? body.error : body.error?.formErrors?.[0];
    throw new ApiError(detail || `Request failed: ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  tasks: {
    list: (params?: { status?: string; category?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
    },
    update: (id: string, data: TaskUpdate) =>
      request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
    create: (data: { text: string; category: TaskCategory }) =>
      request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  },
  health: () => request<{ ok: boolean }>("/health"),
  sessions: {
    create: (transcript: string) =>
      request<CreateSessionResponse>("/sessions", { method: "POST", body: JSON.stringify({ transcript }) }),
    list: () => request<SessionWithTasks[]>("/sessions"),
  },
};
