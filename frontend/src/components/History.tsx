import { useMemo, useState } from "react";
import { useTaskHandlers } from "../hooks/TaskHandlersProvider";
import { useSessions } from "../hooks/useLoopData";
import { formatDate, formatRelative, plural } from "../lib/format";
import { QueryState } from "./QueryState";
import { TaskList } from "./TaskItem";

export function History() {
  const sessionsQuery = useSessions();
  const handlers = useTaskHandlers();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const sessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all = sessionsQuery.data ?? [];
    if (!query) return all;
    return all.filter(
      (session) =>
        session.raw_transcript.toLowerCase().includes(query) || session.tasks.some((task) => task.text.toLowerCase().includes(query))
    );
  }, [sessionsQuery.data, search]);

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>History</h2>
          <p className="muted">{plural(sessionsQuery.data?.length ?? 0, "capture session")}</p>
        </div>
        <input type="search" className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search captures" aria-label="Search captures" />
      </div>

      <QueryState query={sessionsQuery}>
        <div className="history-list">
          {sessions.length === 0 && (
            <div className="empty">{search ? `No captures mention "${search}".` : "Your brain dumps will show up here."}</div>
          )}
          {sessions.map((session) => {
            const open = expanded === session.id;
            const done = session.tasks.filter((task) => task.status === "done").length;
            return (
              <article key={session.id} className={open ? "history-item open" : "history-item"}>
                <button className="history-toggle" aria-expanded={open} onClick={() => setExpanded(open ? null : session.id)}>
                  <span className="history-when">
                    <strong title={formatDate(session.created_at)}>{formatRelative(session.created_at)}</strong>
                    <span className="history-preview">{session.raw_transcript}</span>
                  </span>
                  <span className="history-count">
                    {session.tasks.length ? `${done}/${session.tasks.length} done` : "no items left"}
                  </span>
                </button>
                {open && (
                  <div className="history-detail">
                    <blockquote>{session.raw_transcript}</blockquote>
                    <TaskList tasks={session.tasks} handlers={handlers} compact empty="All items from this capture were deleted." />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </QueryState>
    </section>
  );
}
