import { useMemo } from "react";
import { useTasks } from "../hooks/useLoopData";
import { categories, isActive } from "../lib/format";
import { QueryState } from "./QueryState";

const DAY = 86_400_000;

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function Progress() {
  const tasksQuery = useTasks();
  const tasks = tasksQuery.data ?? [];

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    // updated_at is the best completion timestamp the API exposes today.
    const done = tasks.filter((task) => task.status === "done");
    const days = Array.from({ length: 7 }, (_, index) => {
      const start = today - (6 - index) * DAY;
      return {
        label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(start)),
        count: done.filter((task) => {
          const at = new Date(task.updated_at).getTime();
          return at >= start && at < start + DAY;
        }).length,
      };
    });

    let streak = 0;
    for (let index = days.length - 1; index >= 0; index -= 1) {
      if (days[index].count > 0) streak += 1;
      else if (index !== days.length - 1) break; // today can still be empty
    }

    const byCategory = categories.map((category) => {
      const all = tasks.filter((task) => task.category === category.id);
      const finished = all.filter((task) => task.status === "done").length;
      return { ...category, total: all.length, finished };
    });

    return {
      days,
      streak,
      week: days.reduce((sum, day) => sum + day.count, 0),
      loopsClosed: done.filter((task) => task.category === "open_loop").length,
      active: tasks.filter(isActive).length,
      byCategory,
    };
  }, [tasks]);

  const max = Math.max(1, ...stats.days.map((day) => day.count));

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Progress</h2>
          <p className="muted">Every closed loop counts, however small.</p>
        </div>
      </div>

      <QueryState query={tasksQuery} rows={2}>
        <div className="metric-grid">
          <div className="metric">
            <strong>{stats.week}</strong>
            <span>done in the last 7 days</span>
          </div>
          <div className="metric">
            <strong>{stats.streak}</strong>
            <span>day streak</span>
          </div>
          <div className="metric">
            <strong>{stats.loopsClosed}</strong>
            <span>open loops closed</span>
          </div>
          <div className="metric">
            <strong>{stats.active}</strong>
            <span>still active</span>
          </div>
        </div>

        <div className="progress-grid">
          <figure className="chart">
            <figcaption>Completed per day</figcaption>
            <div className="bars" role="img" aria-label={stats.days.map((day) => `${day.label}: ${day.count}`).join(", ")}>
              {stats.days.map((day, index) => (
                <div key={index} className="bar-col">
                  <span className="bar-value">{day.count || ""}</span>
                  <div className="bar" style={{ height: `${(day.count / max) * 100}%` }} />
                  <span className="bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          </figure>

          <figure className="chart">
            <figcaption>By type</figcaption>
            <div className="breakdown">
              {stats.byCategory.map((item) => (
                <div key={item.id} className="breakdown-row">
                  <div className="breakdown-label">
                    <span>{item.label}</span>
                    <span className="muted">
                      {item.finished}/{item.total}
                    </span>
                  </div>
                  <div className="meter">
                    <div className={`meter-fill tag-${item.id}`} style={{ width: `${item.total ? (item.finished / item.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </figure>
        </div>
      </QueryState>
    </section>
  );
}
