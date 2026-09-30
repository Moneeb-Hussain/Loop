import type { Task } from "../api/client";

const STOP_WORDS = new Set(
  "a an the to of and or for on in at by with my me i need should have has is it that this about up get go do".split(" ")
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
      .map((word) => word.replace(/(ing|ed|s)$/, ""))
  );
}

/** Jaccard overlap of meaningful words, 0..1. */
export function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  left.forEach((word) => {
    if (right.has(word)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

export const DUPLICATE_THRESHOLD = 0.5;

/** The most similar existing task, if it looks like the same item. */
export function findDuplicate(task: Task, existing: Task[]): Task | null {
  let best: Task | null = null;
  let bestScore = DUPLICATE_THRESHOLD;
  for (const candidate of existing) {
    if (candidate.id === task.id || candidate.status === "done") continue;
    const score = similarity(task.text, candidate.text);
    if (score >= bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
