import { useNotices } from "../hooks/useNotices";

export function Notices() {
  const { notices, dismiss } = useNotices();
  return (
    <div className="toasts" aria-live="polite">
      {notices.map((notice) => (
        <div key={notice.id} className={`toast ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <span>{notice.text}</span>
          {notice.action && (
            <button
              className="ghost"
              onClick={() => {
                notice.action?.run();
                dismiss(notice.id);
              }}
            >
              {notice.action.label}
            </button>
          )}
          <button className="toast-close" aria-label="Dismiss" onClick={() => dismiss(notice.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
