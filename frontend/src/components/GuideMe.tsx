import { useMemo, useState } from "react";
import { useTaskHandlers } from "../hooks/TaskHandlersProvider";
import { useTasks } from "../hooks/useLoopData";
import { categoryLabel, daysOld } from "../lib/format";
import { Energy, rankTasks, TimeAvailable } from "../lib/guide";
import { QueryState } from "./QueryState";
import { UrgencyPicker } from "./UrgencyPicker";

const times: TimeAvailable[] = [5, 15, 30];
const energies: { id: Energy; label: string }[] = [
  { id: "low", label: "Running on fumes" },
  { id: "medium", label: "Okay" },
  { id: "high", label: "Ready to go" },
];

export function GuideMe() {
  const tasksQuery = useTasks();
  const handlers = useTaskHandlers();
  const [time, setTime] = useState<TimeAvailable>(15);
  const [energy, setEnergy] = useState<Energy>("medium");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const ranked = useMemo(() => rankTasks(tasksQuery.data ?? [], time, energy, skipped), [tasksQuery.data, time, energy, skipped]);
  const suggestion = ranked[0];

  function skip(id: string) {
    setSkipped((previous) => new Set(previous).add(id));
  }

  return (
    <section className="panel guide">
      <div className="section-title">
        <div>
          <h2>Guide me</h2>
          <p className="muted">Can't pick? Tell me what you've got and I'll choose one thing.</p>
        </div>
      </div>

      <div className="guide-inputs">
        <fieldset>
          <legend>Time available</legend>
          <div className="segmented">
            {times.map((item) => (
              <button key={item} className={time === item ? "active" : ""} aria-pressed={time === item} onClick={() => setTime(item)}>
                {item} min
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Energy</legend>
          <div className="segmented">
            {energies.map((item) => (
              <button key={item.id} className={energy === item.id ? "active" : ""} aria-pressed={energy === item.id} onClick={() => setEnergy(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <QueryState query={tasksQuery} rows={1}>
        {suggestion ? (
          <div className="guide-card" key={suggestion.task.id}>
            <div className="guide-card-meta">
              <span className={`tag tag-${suggestion.task.category}`}>{categoryLabel(suggestion.task.category)}</span>
              <UrgencyPicker value={suggestion.task.urgency} />
              <span className="meta-text">{daysOld(suggestion.task) ? `${daysOld(suggestion.task)}d old` : "new today"}</span>
            </div>
            <h3>{suggestion.task.text}</h3>
            <p className="muted">{suggestion.reason}</p>
            <div className="first-step">
              <span>First step</span>
              <p>{suggestion.firstStep}</p>
            </div>
            <div className="actions">
              <button onClick={() => handlers.onComplete(suggestion.task)}>Did it</button>
              <button className="ghost" onClick={() => skip(suggestion.task.id)}>
                Not this one
              </button>
              <button className="ghost" onClick={() => handlers.onSnooze(suggestion.task)}>
                Snooze it
              </button>
            </div>
            {ranked.length > 1 && <p className="muted small">{ranked.length - 1} more option{ranked.length === 2 ? "" : "s"} after this.</p>}
          </div>
        ) : (
          <div className="empty">
            {skipped.size > 0 ? (
              <>
                <p>That's everything. Nothing has to happen right now.</p>
                <button className="ghost" onClick={() => setSkipped(new Set())}>
                  Start over
                </button>
              </>
            ) : (
              "No active tasks. Capture a brain dump first."
            )}
          </div>
        )}
      </QueryState>
    </section>
  );
}
