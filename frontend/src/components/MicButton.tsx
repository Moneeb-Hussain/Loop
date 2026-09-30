import type { CSSProperties } from "react";
import type { MicStatus } from "../hooks/useLiveTranscription";

const statusCopy: Record<MicStatus, string> = {
  idle: "Tap to talk",
  starting: "Waiting for microphone…",
  connecting: "Connecting…",
  listening: "Listening. Tap to stop",
  reconnecting: "Connection dropped, reconnecting…",
};

export function MicButton({
  status,
  level,
  onStart,
  onStop,
  disabled = false,
}: {
  status: MicStatus;
  level: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const active = status !== "idle";
  return (
    <div className={`mic ${status}`}>
      <button
        className="mic-button"
        onClick={active ? onStop : onStart}
        disabled={disabled}
        aria-pressed={active}
        aria-label={active ? "Stop recording" : "Start recording"}
        style={{ "--level": level } as CSSProperties}
      >
        <span className="mic-ring" aria-hidden="true" />
        {active ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" rx="2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" />
          </svg>
        )}
      </button>
      <p className="mic-status" aria-live="polite">
        {statusCopy[status]}
      </p>
    </div>
  );
}
