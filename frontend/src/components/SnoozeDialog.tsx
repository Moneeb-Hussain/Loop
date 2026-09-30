import { FormEvent, useEffect, useRef, useState } from "react";
import type { Task } from "../api/client";

interface Preset {
  label: string;
  at: () => Date;
}

function atHour(daysAhead: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date;
}

const presets: Preset[] = [
  { label: "In 3 hours", at: () => new Date(Date.now() + 3 * 3_600_000) },
  { label: "Tomorrow morning", at: () => atHour(1, 9) },
  { label: "In 3 days", at: () => atHour(3, 9) },
  { label: "Next week", at: () => atHour(7, 9) },
];

const reasons = ["Waiting on someone", "Not enough energy", "Wrong time of day", "Need more info"];

export function SnoozeDialog({
  task,
  onClose,
  onSnooze,
}: {
  task: Task | null;
  onClose: () => void;
  onSnooze: (task: Task, until: Date, reason: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [presetIndex, setPresetIndex] = useState(1);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (task && !dialog.open) {
      setPresetIndex(1);
      setReason(task.snooze_reason ?? "");
      dialog.showModal();
    }
    if (!task && dialog.open) dialog.close();
  }, [task]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    onSnooze(task, presets[presetIndex].at(), reason.trim() || "Later");
    onClose();
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      {task && (
        <form onSubmit={submit}>
          <h2>Snooze</h2>
          <p className="dialog-task">{task.text}</p>

          <fieldset>
            <legend>Bring it back</legend>
            <div className="choice-grid">
              {presets.map((preset, index) => (
                <button
                  type="button"
                  key={preset.label}
                  className={presetIndex === index ? "active" : ""}
                  aria-pressed={presetIndex === index}
                  onClick={() => setPresetIndex(index)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>Why not now? (optional)</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Later" autoFocus />
          </label>
          <div className="chips small">
            {reasons.map((item) => (
              <button type="button" key={item} className={reason === item ? "active" : ""} onClick={() => setReason(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="actions end">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Snooze</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
