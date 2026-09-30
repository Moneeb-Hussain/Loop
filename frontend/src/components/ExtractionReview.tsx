import { useMemo, useState } from "react";
import type { CreateSessionResponse, Task } from "../api/client";
import { useTaskHandlers } from "../hooks/TaskHandlersProvider";
import { useTaskActions, useTasks } from "../hooks/useLoopData";
import { notify } from "../hooks/useNotices";
import { plural } from "../lib/format";
import { findDuplicate } from "../lib/similarity";
import { TaskItem } from "./TaskItem";

/**
 * After extraction, show what was created and flag items that look like
 * something already on the list. The user decides whether to merge; nothing
 * is merged silently.
 */
export function ExtractionReview({
  result,
  existing,
  onDone,
}: {
  result: CreateSessionResponse;
  existing: Task[];
  onDone: () => void;
}) {
  const tasksQuery = useTasks();
  const actions = useTaskActions();
  const handlers = useTaskHandlers();
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const duplicates = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of result.tasks) {
      const match = findDuplicate(task, existing);
      if (match) map.set(task.id, match);
    }
    return map;
  }, [result.tasks, existing]);

  // Read live copies so edits made here show up immediately.
  const liveTasks = result.tasks
    .map((task) => tasksQuery.data?.find((item) => item.id === task.id))
    .filter((task): task is Task => Boolean(task));

  const pending = liveTasks.filter((task) => duplicates.has(task.id) && !resolved.has(task.id));

  function resolve(id: string) {
    setResolved((previous) => new Set(previous).add(id));
  }

  async function merge(task: Task, into: Task) {
    resolve(task.id);
    await actions.remove(task.id);
    await actions.update(into.id, {
      urgency: Math.max(into.urgency, task.urgency),
      ...(into.status !== "open" ? { status: "open" as const } : {}),
    });
    notify("success", `Merged into "${into.text}".`);
  }

  async function mergeAll() {
    for (const task of pending) {
      const into = duplicates.get(task.id);
      if (into) await merge(task, into);
    }
  }

  return (
    <section className="panel review">
      <div className="section-title">
        <div>
          <h2>Here's what I heard</h2>
          <p className="muted">
            {result.degraded
              ? "AI sorting was unavailable, so your whole ramble is saved as one open loop. Edit it below or split it up later."
              : liveTasks.length
                ? `${plural(liveTasks.length, "item")} added. Click any text to fix it.`
                : "Nothing actionable came out of that one."}
          </p>
        </div>
        <button onClick={onDone}>{pending.length ? "Skip and view tasks" : "View all tasks"}</button>
      </div>

      {result.degraded && <div className="banner warning">Extraction fell back to a single item.</div>}

      {pending.length > 1 && (
        <div className="banner">
          <span>{plural(pending.length, "item")} look like things already on your list.</span>
          <button className="ghost" onClick={() => void mergeAll()}>
            Merge all
          </button>
        </div>
      )}

      <div className="task-list">
        {liveTasks.map((task) => {
          const match = duplicates.get(task.id);
          const showMatch = match && !resolved.has(task.id);
          return (
            <div key={task.id} className={showMatch ? "review-item has-match" : "review-item"}>
              <TaskItem task={task} handlers={handlers} />
              {showMatch && (
                <div className="match">
                  <p>
                    Looks like <strong>"{match.text}"</strong>, which is already on your list.
                  </p>
                  <div className="actions">
                    <button onClick={() => void merge(task, match)}>Merge</button>
                    <button className="ghost" onClick={() => resolve(task.id)}>
                      Keep both
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <details className="raw">
        <summary>Original transcript</summary>
        <p>{result.session.raw_transcript}</p>
      </details>
    </section>
  );
}
