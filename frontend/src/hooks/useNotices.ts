import { create } from "zustand";

export type NoticeTone = "info" | "success" | "warning" | "error";

export interface Notice {
  id: number;
  tone: NoticeTone;
  text: string;
  action?: { label: string; run: () => void };
}

interface NoticeState {
  notices: Notice[];
  push: (notice: Omit<Notice, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useNotices = create<NoticeState>((set, get) => ({
  notices: [],
  push: (notice) => {
    const id = nextId++;
    set({ notices: [...get().notices.slice(-2), { ...notice, id }] });
    window.setTimeout(() => get().dismiss(id), notice.tone === "error" ? 8000 : 4500);
  },
  dismiss: (id) => set({ notices: get().notices.filter((notice) => notice.id !== id) }),
}));

export function notify(tone: NoticeTone, text: string, action?: Notice["action"]) {
  useNotices.getState().push({ tone, text, action });
}

export function notifyError(error: unknown, fallback: string) {
  notify("error", error instanceof Error ? error.message : fallback);
}
