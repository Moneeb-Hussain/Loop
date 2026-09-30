import type { Task, TaskCategory, TaskStatus } from "../api/client";

export const categories: { id: TaskCategory; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "reminder", label: "Reminder" },
  { id: "open_loop", label: "Open loop" },
];

export function categoryLabel(category: TaskCategory): string {
  return categories.find((item) => item.id === category)?.label ?? category;
}

export function statusLabel(status: TaskStatus): string {
  return status[0].toUpperCase() + status.slice(1);
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelative(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
}

export function daysOld(task: Task): number {
  return Math.max(0, Math.floor((Date.now() - new Date(task.first_flagged_at).getTime()) / 86_400_000));
}

/**
 * A snoozed task whose snooze has run out is due again. The backend has no
 * scheduler to flip it back to "open", so the UI treats it as active.
 */
export function isSnoozeOver(task: Task): boolean {
  return task.status === "snoozed" && (!task.snoozed_until || new Date(task.snoozed_until).getTime() <= Date.now());
}

export function isActive(task: Task): boolean {
  return task.status === "open" || isSnoozeOver(task);
}
