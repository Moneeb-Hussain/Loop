import { useQuery } from "@tanstack/react-query";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { api } from "./api/client";
import { CaptureView } from "./components/CaptureView";
import { GuideMe } from "./components/GuideMe";
import { History } from "./components/History";
import { Notices } from "./components/Notices";
import { Progress } from "./components/Progress";
import { TaskListView } from "./components/TaskListView";
import { TaskHandlersProvider } from "./hooks/TaskHandlersProvider";
import { useTasks } from "./hooks/useLoopData";
import { isActive } from "./lib/format";
import "./App.css";

function ConnectionPill() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30_000, retry: false });
  const state = health.isPending ? "checking" : health.isSuccess ? "online" : "offline";
  return (
    <div className={`status-pill ${state}`} title={state === "offline" ? "Start the backend with npm run dev in /backend" : undefined}>
      <span className="dot" aria-hidden="true" />
      {state === "checking" ? "Connecting" : state === "online" ? "Connected" : "Backend offline"}
    </div>
  );
}

export default function App() {
  const tasks = useTasks();
  const activeCount = tasks.data?.filter(isActive).length ?? 0;

  const tabs = [
    { to: "/capture", label: "Capture" },
    { to: "/tasks", label: "Tasks", badge: activeCount },
    { to: "/guide", label: "Guide me" },
    { to: "/history", label: "History" },
    { to: "/progress", label: "Progress" },
  ];

  return (
    <TaskHandlersProvider>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="logo" aria-hidden="true" />
            <span>Loop</span>
          </div>
          <ConnectionPill />
        </header>

        <nav className="tabs" aria-label="Loop sections">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive: active }) => (active ? "tab active" : "tab")}>
              {tab.label}
              {tab.badge ? <span className="count">{tab.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <main>
          <Routes>
            <Route path="/capture" element={<CaptureView />} />
            <Route path="/tasks" element={<TaskListView />} />
            <Route path="/guide" element={<GuideMe />} />
            <Route path="/history" element={<History />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="*" element={<Navigate to="/capture" replace />} />
          </Routes>
        </main>
      </div>
      <Notices />
    </TaskHandlersProvider>
  );
}
