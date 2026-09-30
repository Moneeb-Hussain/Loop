import { KeyboardEvent, useEffect, useState } from "react";
import type { Task, TaskUpdate } from "../api/client";
import { categoryLabel, formatDate, formatRelative, isSnoozeOver } from "../lib/format";
import { UrgencyPicker } from "./UrgencyPicker";

export interface TaskHandlers {
  onUpdate: (id: string, data: TaskUpdate) => void;
  onDelete: (id: string) => void;
  onSnooze: (task: Task) => void;
  onComplete: (task: Task) => void;
}

export function TaskItem({ task, handlers, compact = false }: { task: Task; handlers: TaskHandlers; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const snoozeOver = isSnoozeOver(task);
  const done = task.status === "done";

  useEffect(() => {
    if (!editing) setDraft(task.text);
  }, [task.text, editing]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = window.setTimeout(() => setConfirmDelete(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmDelete]);

  function saveEdit() {
    const text = draft.trim();
    setEditing(false);
    if (text && text !== task.text) handlers.onUpdate(task.id, { text });
    else setDraft(task.text);
  }

  function onEditKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") saveEdit();
    if (event.key === "Escape") {
      setDraft(task.text);
      setEditing(false);
    }
  }

  return (
    <article className={`task-item ${task.status} cat-${task.category}${snoozeOver ? " due" : ""}${compact ? " compact" : ""}`}>
      <button
        className="check"
        aria-label={done ? `Reopen "${task.text}"` : `Mark "${task.text}" done`}
        title={done ? "Reopen" : "Mark done"}
        onClick={() => (done ? handlers.onUpdate(task.id, { status: "open" }) : handlers.onComplete(task))}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </button>

      <div className="task-body">
        {editing ? (
          <input
            className="task-edit"
            value={draft}
            autoFocus
            aria-label="Task text"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={saveEdit}
            onKeyDown={onEditKey}
          />
        ) : (
          <h3>
            <button className="task-text" onClick={() => !done && setEditing(true)} title={done ? undefined : "Click to edit"}>
              {task.text}
            </button>
          </h3>
        )}
        <div className="task-meta">
          <span className={`tag tag-${task.category}`}>{categoryLabel(task.category)}</span>
          <UrgencyPicker
            value={task.urgency}
            disabled={done}
            onChange={(urgency) => urgency !== task.urgency && handlers.onUpdate(task.id, { urgency })}
          />
          {task.status === "snoozed" && task.snoozed_until && (
            <span className="meta-text">
              {snoozeOver ? "Snooze ended" : `Snoozed until ${formatDate(task.snoozed_until)}`}
            </span>
          )}
          {done ? (
            <span className="meta-text">Done {formatRelative(task.updated_at)}</span>
          ) : (
            <span className="meta-text" title={formatDate(task.first_flagged_at)}>
              Added {formatRelative(task.first_flagged_at)}
            </span>
          )}
        </div>
        {task.status === "snoozed" && task.snooze_reason && <p className="snooze-reason">{task.snooze_reason}</p>}
      </div>

      <div className="task-actions">
        {task.status === "snoozed" && (
          <button className="ghost" onClick={() => handlers.onUpdate(task.id, { status: "open" })}>
            Wake up
          </button>
        )}
        {task.status === "open" && (
          <button className="ghost" onClick={() => handlers.onSnooze(task)}>
            Snooze
          </button>
        )}
        <button
          className={confirmDelete ? "danger" : "ghost danger-text"}
          onClick={() => (confirmDelete ? handlers.onDelete(task.id) : setConfirmDelete(true))}
        >
          {confirmDelete ? "Confirm" : "Delete"}
        </button>
      </div>
    </article>
  );
}

export function TaskList({ tasks, handlers, compact = false, empty }: { tasks: Task[]; handlers: TaskHandlers; compact?: boolean; empty?: string }) {
  if (tasks.length === 0) return <div className="empty">{empty ?? "Nothing here."}</div>;
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} handlers={handlers} compact={compact} />
      ))}
    </div>
  );
}
