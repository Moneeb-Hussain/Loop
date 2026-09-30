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
  | { type: "ready" | "Begin" | "SpeechStarted" | "closed" }
  | { type: "transcript"; text: string; final: boolean; turnOrder?: number }
  | { type: "error"; message: string };

export interface GuidePick {
  eventId: string | null;
  task: Task | null;
  reason: string;
  firstStep: string;
  remaining: number;
  degraded: boolean;
}

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
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${res.status}`, res.status);
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
  sessions: {
    create: (transcript: string) =>
      request<CreateSessionResponse>("/sessions", { method: "POST", body: JSON.stringify({ transcript }) }),
    list: () => request<SessionWithTasks[]>("/sessions"),
  },
  guide: {
    suggest: (
      data: { timeAvailable: 5 | 15 | 30; energyLevel: "low" | "medium" | "high"; skipIds: string[] },
      signal?: AbortSignal
    ) => request<GuidePick>("/guide-me", { method: "POST", body: JSON.stringify(data), signal }),
    feedback: (eventId: string, accepted: boolean) =>
      request<unknown>(`/guide-me/${eventId}/feedback`, { method: "POST", body: JSON.stringify({ accepted }) }),
  },
};
