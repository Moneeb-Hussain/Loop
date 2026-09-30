import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * File-backed store for the demo. Tasks and sessions live in
 * backend/data/store.json so they survive a restart, with no database
 * to install. The exported functions stay the same so a later Postgres
 * swap only replaces this file.
 */

export type TaskCategory = "task" | "reminder" | "open_loop";
export type TaskStatus = "open" | "done" | "snoozed";

export interface Session {
  id: string;
  raw_transcript: string;
  created_at: string;
}

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

const dataDir = process.env.VERCEL ? "/tmp/loop" : join(dirname(fileURLToPath(import.meta.url)), "../../data");
const dataFile = join(dataDir, "store.json");

export interface GuideMeEvent {
  id: string;
  task_id: string | null;
  time_available: string;
  energy_level: string;
  reason_given: string | null;
  first_step_given: string | null;
  accepted: boolean | null;
  created_at: string;
}

const sessions: Session[] = [];
const tasks: Task[] = [];
const guideEvents: GuideMeEvent[] = [];

function now(): string {
  return new Date().toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function hoursAhead(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function save(): void {
  try {
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(dataFile, JSON.stringify({ sessions, tasks, guideEvents }, null, 2));
  } catch (error) {
    console.error("Could not save demo data:", error);
  }
}

function seed(): void {
  const sessionId = randomUUID();
  const capturedAt = hoursAgo(30);
  sessions.push({
    id: sessionId,
    raw_transcript:
      "Email Sam about Friday, book the dentist, pay the electricity bill, and I keep worrying the budget deck isn't ready.",
    created_at: capturedAt,
  });

  const samples: Array<Omit<Task, "id">> = [
    {
      origin_session_id: sessionId,
      text: "Email Sam about Friday",
      category: "task",
      status: "open",
      urgency: 4,
      first_flagged_at: capturedAt,
      snoozed_until: null,
      snooze_reason: null,
      created_at: capturedAt,
      updated_at: capturedAt,
    },
    {
      origin_session_id: sessionId,
      text: "Book the dentist",
      category: "reminder",
      status: "open",
      urgency: 3,
      first_flagged_at: capturedAt,
      snoozed_until: null,
      snooze_reason: null,
      created_at: capturedAt,
      updated_at: capturedAt,
    },
    {
      origin_session_id: sessionId,
      text: "Pay the electricity bill",
      category: "task",
      status: "done",
      urgency: 3,
      first_flagged_at: hoursAgo(50),
      snoozed_until: null,
      snooze_reason: null,
      created_at: hoursAgo(50),
      updated_at: hoursAgo(20),
    },
    {
      origin_session_id: sessionId,
      text: "Worrying the budget deck isn't ready",
      category: "open_loop",
      status: "snoozed",
      urgency: 2,
      first_flagged_at: capturedAt,
      snoozed_until: hoursAhead(20),
      snooze_reason: "Need more info",
      created_at: capturedAt,
      updated_at: hoursAgo(2),
    },
  ];

  for (const sample of samples) {
    tasks.push({ id: randomUUID(), ...sample });
  }
  save();
}

function load(): void {
  if (!existsSync(dataFile)) {
    seed();
    return;
  }

  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as {
      sessions?: Session[];
      tasks?: Task[];
      guideEvents?: GuideMeEvent[];
    };
    sessions.push(...(parsed.sessions ?? []));
    tasks.push(...(parsed.tasks ?? []));
    guideEvents.push(...(parsed.guideEvents ?? []));
  } catch (error) {
    console.error("Could not read demo data, starting fresh:", error);
    seed();
  }
}

load();

export function listTasks(filter?: { status?: string; category?: string }): Task[] {
  return tasks
    .filter((t) => (filter?.status ? t.status === filter.status : true))
    .filter((t) => (filter?.category ? t.category === filter.category : true))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function createTask(data: {
  text: string;
  category: TaskCategory;
  urgency?: number;
  origin_session_id?: string | null;
}): Task {
  const timestamp = now();
  const task: Task = {
    id: randomUUID(),
    origin_session_id: data.origin_session_id ?? null,
    text: data.text,
    category: data.category,
    status: "open",
    urgency: data.urgency ?? 3,
    first_flagged_at: timestamp,
    snoozed_until: null,
    snooze_reason: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  tasks.push(task);
  save();
  return task;
}

export function updateTask(
  id: string,
  data: Partial<Pick<Task, "status" | "urgency" | "text" | "snoozed_until" | "snooze_reason">>
): Task | undefined {
  const task = tasks.find((t) => t.id === id);
  if (!task) return undefined;
  Object.assign(task, data, { updated_at: now() });
  save();
  return task;
}

export function deleteTask(id: string): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  save();
  return true;
}

export function createSession(rawTranscript: string): Session {
  const session: Session = { id: randomUUID(), raw_transcript: rawTranscript, created_at: now() };
  sessions.push(session);
  save();
  return session;
}

export function listSessions(): Session[] {
  return [...sessions].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getTasksBySession(sessionId: string): Task[] {
  return tasks.filter((t) => t.origin_session_id === sessionId);
}

export function createGuideEvent(data: {
  taskId: string;
  timeAvailable: string;
  energyLevel: string;
  reason: string;
  firstStep: string;
}): GuideMeEvent {
  const event: GuideMeEvent = {
    id: randomUUID(),
    task_id: data.taskId,
    time_available: data.timeAvailable,
    energy_level: data.energyLevel,
    reason_given: data.reason,
    first_step_given: data.firstStep,
    accepted: null,
    created_at: now(),
  };
  guideEvents.push(event);
  save();
  return event;
}

export function setGuideFeedback(id: string, accepted: boolean): GuideMeEvent | undefined {
  const event = guideEvents.find((item) => item.id === id);
  if (!event) return undefined;
  event.accepted = accepted;
  save();
  return event;
}
