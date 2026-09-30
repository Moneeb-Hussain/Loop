import type { Task } from "../api/client";
import { daysOld, isActive } from "./format";

export type Energy = "low" | "medium" | "high";
export type TimeAvailable = 5 | 15 | 30;

export interface GuideSuggestion {
  task: Task;
  reason: string;
  firstStep: string;
}

const QUICK_VERBS = /\b(email|text|call|message|reply|ping|book|pay|order|buy|send|schedule|cancel|renew|check)\b/i;

/** Rough effort estimate: 1 = a couple of minutes, 3 = needs real focus. */
function effort(task: Task): 1 | 2 | 3 {
  if (task.category === "reminder") return 1;
  if (task.category === "open_loop") return 3;
  if (QUICK_VERBS.test(task.text) && task.text.split(/\s+/).length <= 8) return 1;
  return task.text.split(/\s+/).length > 10 ? 3 : 2;
}

function capacity(time: TimeAvailable, energy: Energy): number {
  const base = time === 5 ? 1 : time === 15 ? 2 : 3;
  const adjust = energy === "low" ? -1 : energy === "high" ? 1 : 0;
  return Math.min(3, Math.max(1, base + adjust));
}

function score(task: Task, time: TimeAvailable, energy: Energy): number {
  const fit = capacity(time, energy) - effort(task);
  const fitScore = fit < 0 ? fit * 3 : energy === "high" && fit === 0 ? 1 : 0;
  return task.urgency * 2 + Math.min(5, daysOld(task)) + fitScore;
}

function explain(task: Task, time: TimeAvailable, energy: Energy): string {
  const parts: string[] = [];
  if (task.urgency >= 4) parts.push(`it's marked urgent (${task.urgency}/5)`);
  const age = daysOld(task);
  if (age >= 2) parts.push(`it's been waiting ${age} days`);
  const fit = capacity(time, energy) - effort(task);
  if (fit >= 0) parts.push(`it fits in ${time} minutes at ${energy} energy`);
  else parts.push(`it's the most pressing thing, even if it's a stretch for ${time} minutes`);
  return `Picked because ${parts.join(", ")}.`;
}

function firstStep(task: Task, time: TimeAvailable): string {
  const text = task.text.toLowerCase();
  if (task.category === "open_loop") {
    return "Write three sentences: what's bugging you, what \"done\" looks like, and one thing you could do next.";
  }
  if (/\b(email|reply|message|text)\b/.test(text)) return "Open a blank draft and write just the first line.";
  if (/\bcall\b/.test(text)) return "Find the number and put it on screen. Dial before you overthink it.";
  if (/\b(book|schedule)\b/.test(text)) return "Open the booking page or calendar and pick the first slot that works.";
  if (/\b(pay|order|buy|renew)\b/.test(text)) return "Open the site or app where this gets done and get to the checkout page.";
  if (/\b(write|draft|plan|prepare|finish)\b/.test(text)) return "Open the document and write a rough outline. Messy is fine.";
  if (task.category === "reminder") return "Do it now if it takes under two minutes. Otherwise set a phone alarm for it.";
  return time === 5
    ? "Set a 5-minute timer and do only the very first physical action."
    : "Open the place where this task starts and work on it for two minutes. Keep going if it's flowing.";
}

export function rankTasks(tasks: Task[], time: TimeAvailable, energy: Energy, skipped: Set<string>): GuideSuggestion[] {
  return tasks
    .filter((task) => isActive(task) && !skipped.has(task.id))
    .map((task) => ({ task, value: score(task, time, energy) }))
    .sort((a, b) => b.value - a.value)
    .map(({ task }) => ({ task, reason: explain(task, time, energy), firstStep: firstStep(task, time) }));
}
