import { callLemur, parseJsonSafe } from "./lemur.js";
import * as store from "../store/memoryStore.js";

type Energy = "low" | "medium" | "high";
type Minutes = 5 | 15 | 30;

export interface GuidePick {
  eventId: string | null;
  task: store.Task | null;
  reason: string;
  firstStep: string;
  remaining: number;
  degraded: boolean;
}

function isActive(task: store.Task): boolean {
  if (task.status === "open") return true;
  if (task.status !== "snoozed") return false;
  return !task.snoozed_until || new Date(task.snoozed_until).getTime() <= Date.now();
}

function daysOld(task: store.Task): number {
  return Math.max(0, Math.floor((Date.now() - new Date(task.first_flagged_at).getTime()) / 86_400_000));
}

function effort(task: store.Task): number {
  if (task.category === "reminder") return 1;
  if (task.category === "open_loop") return 3;
  return task.text.split(/\s+/).length > 10 ? 3 : 2;
}

function capacity(minutes: Minutes, energy: Energy): number {
  const base = minutes === 5 ? 1 : minutes === 15 ? 2 : 3;
  const adjust = energy === "low" ? -1 : energy === "high" ? 1 : 0;
  return Math.min(3, Math.max(1, base + adjust));
}

function fallbackCopy(task: store.Task, minutes: Minutes, energy: Energy): { reason: string; firstStep: string } {
  const age = daysOld(task);
  const reason = age >= 2
    ? `It fits ${minutes} minutes at ${energy} energy, and it has been waiting ${age} days.`
    : `It fits ${minutes} minutes at ${energy} energy, and it is the most pressing open item.`;
  const firstStep = task.category === "open_loop"
    ? "Write one sentence about what done looks like, then name the next action."
    : "Open the place where this starts and do the first two minutes.";
  return { reason, firstStep };
}

async function explainWithLemur(task: store.Task, minutes: Minutes, energy: Energy): Promise<{ reason: string; firstStep: string } | null> {
  const raw = await callLemur({
    prompt: `You help someone with ADHD start exactly one task. Do not pick a different task.
Return ONLY JSON: {"reason":"one sentence why this task fits their time and energy","firstStep":"one concrete first action, under 18 words"}`,
    input_text: `Task: ${task.text}
Category: ${task.category}
Urgency: ${task.urgency}/5
Days waiting: ${daysOld(task)}
Time available: ${minutes} minutes
Energy: ${energy}`,
    timeoutMs: 8000,
  });

  const parsed = parseJsonSafe<{ reason?: unknown; firstStep?: unknown }>(raw);
  if (typeof parsed.reason !== "string" || typeof parsed.firstStep !== "string") return null;
  const reason = parsed.reason.trim();
  const firstStep = parsed.firstStep.trim();
  if (!reason || !firstStep) return null;
  return { reason, firstStep };
}

export async function pickGuideTask(minutes: Minutes, energy: Energy, skipIds: string[]): Promise<GuidePick> {
  const skipped = new Set(skipIds);
  const ranked = store
    .listTasks()
    .filter((task) => isActive(task) && !skipped.has(task.id))
    .map((task) => {
      const fit = capacity(minutes, energy) - effort(task);
      const score = task.urgency * 2 + Math.min(5, daysOld(task)) + (fit < 0 ? fit * 3 : 0);
      return { task, score };
    })
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0]?.task;
  if (!winner) {
    return { eventId: null, task: null, reason: "", firstStep: "", remaining: 0, degraded: false };
  }

  const fallback = fallbackCopy(winner, minutes, energy);
  let copy = fallback;
  let degraded = true;
  try {
    const explained = await explainWithLemur(winner, minutes, energy);
    if (explained) {
      copy = explained;
      degraded = false;
    }
  } catch (error) {
    console.error("Guide Me LeMUR failed, using local copy:", error);
  }

  const event = store.createGuideEvent({
    taskId: winner.id,
    timeAvailable: String(minutes),
    energyLevel: energy,
    reason: copy.reason,
    firstStep: copy.firstStep,
  });

  return {
    eventId: event.id,
    task: winner,
    reason: copy.reason,
    firstStep: copy.firstStep,
    remaining: Math.max(0, ranked.length - 1),
    degraded,
  };
}
