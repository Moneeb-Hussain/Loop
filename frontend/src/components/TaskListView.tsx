import { FormEvent, useMemo, useState } from "react";
import type { TaskCategory } from "../api/client";
import { useTaskHandlers } from "../hooks/TaskHandlersProvider";
import { useTaskActions, useTasks } from "../hooks/useLoopData";
import { categories, isActive } from "../lib/format";
import { QueryState } from "./QueryState";
import { TaskList } from "./TaskItem";

type Filter = "today" | "reminder" | "task" | "open_loop" | "snoozed" | "done";
type Sort = "priority" | "newest" | "oldest";

const filters: { id: Filter; label: string }[] = [
  { id: "today", label: "Active" },
  { id: "task", label: "Tasks" },
  { id: "reminder", label: "Reminders" },
  { id: "open_loop", label: "Open loops" },
  { id: "snoozed", label: "Snoozed" },
  { id: "done", label: "Done" },
];

const emptyCopy: Record<Filter, string> = {
  today: "Nothing active. Capture a ramble or add something above.",
  task: "No active tasks.",
  reminder: "No active reminders.",
  open_loop: "No open loops. Nice.",
  snoozed: "Nothing snoozed.",
  done: "Nothing finished yet. Your first one is waiting.",
};

export function TaskListView() {
  const tasksQuery = useTasks();
  const actions = useTaskActions();
  const handlers = useTaskHandlers();
  const [filter, setFilter] = useState<Filter>("today");
  const [sort, setSort] = useState<Sort>("priority");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<TaskCategory>("task");

  const tasks = tasksQuery.data ?? [];

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { today: 0, task: 0, reminder: 0, open_loop: 0, snoozed: 0, done: 0 };
    for (const task of tasks) {
      if (task.status === "done") result.done += 1;
      else if (!isActive(task)) result.snoozed += 1;
      if (isActive(task)) {
        result.today += 1;
        result[task.category] += 1;
      }
    }
    return result;
  }, [tasks]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      if (query && !task.text.toLowerCase().includes(query)) return false;
      if (filter === "done") return task.status === "done";
      if (filter === "snoozed") return task.status === "snoozed" && !isActive(task);
      if (!isActive(task)) return false;
      return filter === "today" || task.category === filter;
    });
    return filtered.sort((a, b) => {
      if (sort === "newest") return b.created_at.localeCompare(a.created_at);
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (filter === "done") return b.updated_at.localeCompare(a.updated_at);
      return b.urgency - a.urgency || a.first_flagged_at.localeCompare(b.first_flagged_at);
    });
  }, [tasks, filter, sort, search]);

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    const created = await actions.create({ text: value, category });
    if (created) setText("");
  }

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Tasks</h2>
          <p className="muted">{counts.today} active · {counts.snoozed} snoozed · {counts.done} done</p>
        </div>
        <button className="ghost" onClick={() => void tasksQuery.refetch()} disabled={tasksQuery.isFetching}>
          {tasksQuery.isFetching ? "Syncing…" : "Refresh"}
        </button>
      </div>

      <form className="manual-add" onSubmit={addTask}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Add something quickly…" aria-label="New task" />
        <select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)} aria-label="Category">
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!text.trim() || actions.isCreating}>
          Add
        </button>
      </form>

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Filter tasks">
          {filters.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={filter === item.id}
              className={filter === item.id ? "active" : ""}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span className="count">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            type="search"
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search tasks"
          />
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort">
            <option value="priority">Most urgent</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <QueryState query={tasksQuery}>
        <TaskList tasks={visible} handlers={handlers} empty={search ? `Nothing matches "${search}".` : emptyCopy[filter]} />
      </QueryState>
    </section>
  );
}
