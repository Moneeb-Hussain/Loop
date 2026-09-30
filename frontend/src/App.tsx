import { NavLink, Route, Routes } from "react-router-dom";
import { CaptureView } from "./components/CaptureView";
import { GuideMe } from "./components/GuideMe";
import { History } from "./components/History";
import { Progress } from "./components/Progress";
import { TaskListView } from "./components/TaskListView";
import "./App.css";

const links = [
  { to: "/", label: "Capture", end: true },
  { to: "/tasks", label: "Tasks" },
  { to: "/guide", label: "Guide Me" },
  { to: "/history", label: "History" },
  { to: "/progress", label: "Progress" },
];

export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Loop</p>
          <h1>Capture messy thoughts, turn them into next actions.</h1>
        </div>
      </header>

      <nav className="tabs" aria-label="Loop sections">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : undefined)}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<CaptureView />} />
        <Route path="/tasks" element={<TaskListView />} />
        <Route path="/guide" element={<GuideMe />} />
        <Route path="/history" element={<History />} />
        <Route path="/progress" element={<Progress />} />
      </Routes>
    </main>
  );
}
