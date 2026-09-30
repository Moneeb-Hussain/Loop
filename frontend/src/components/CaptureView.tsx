import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateSessionResponse, Task } from "../api/client";
import { useLiveTranscription } from "../hooks/useLiveTranscription";
import { useTaskActions, useTasks } from "../hooks/useLoopData";
import { notify, notifyError } from "../hooks/useNotices";
import { ExtractionReview } from "./ExtractionReview";
import { LiveTranscript } from "./LiveTranscript";
import { MicButton } from "./MicButton";
import { SortingTransition } from "./SortingTransition";

const DRAFT_KEY = "loop:draft";

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(text: string) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable (private mode). The draft just won't survive a reload.
  }
}

export function CaptureView() {
  const live = useLiveTranscription();
  const actions = useTaskActions();
  const tasksQuery = useTasks();
  const navigate = useNavigate();
  const [sortingText, setSortingText] = useState<string | null>(null);
  const [review, setReview] = useState<{ result: CreateSessionResponse; existing: Task[] } | null>(null);

  // Restore an unsent draft once on mount.
  useEffect(() => {
    const draft = readDraft();
    if (draft) live.setTranscript(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live.isActive) writeDraft(live.transcript);
  }, [live.transcript, live.isActive]);

  useEffect(() => {
    if (live.error) notify("error", live.error);
  }, [live.error]);

  async function extract() {
    const text = [live.transcript, live.partial].filter(Boolean).join(" ").trim();
    if (!text) {
      notify("warning", "Say or type something first.");
      return;
    }
    if (live.isActive) live.stop();

    const existing = tasksQuery.data ?? [];
    setSortingText(text);
    try {
      const result = await actions.extract(text);
      live.setTranscript("");
      writeDraft("");
      setReview({ result, existing });
    } catch (error) {
      notifyError(error, "Couldn't sort that transcript. It's still here, so try again.");
    } finally {
      setSortingText(null);
    }
  }

  if (sortingText !== null) {
    return (
      <section className="panel">
        <SortingTransition transcript={sortingText} />
      </section>
    );
  }

  if (review) {
    return <ExtractionReview result={review.result} existing={review.existing} onDone={() => navigate("/tasks")} />;
  }

  const hasText = Boolean(live.transcript || live.partial);
  const words = live.transcript.split(/\s+/).filter(Boolean).length;

  return (
    <section className="panel capture">
      <div className="capture-hero">
        <MicButton status={live.status} level={live.level} onStart={() => void live.start()} onStop={live.stop} />
        <div>
          <h2>Brain dump</h2>
          <p className="muted">Talk through everything on your mind. Loop sorts it into tasks, reminders and open loops.</p>
        </div>
      </div>

      <LiveTranscript
        transcript={live.transcript}
        partial={live.partial}
        recording={live.isActive}
        onChange={live.setTranscript}
        onSubmit={() => void extract()}
      />

      <div className="actions spread">
        <span className="muted small">{words ? `${words} words` : "Tip: Ctrl+Enter to sort"}</span>
        <div className="actions">
          <button className="ghost" onClick={() => live.setTranscript("")} disabled={!hasText || live.isActive}>
            Clear
          </button>
          <button onClick={() => void extract()} disabled={!hasText}>
            {live.isActive ? "Stop and sort" : "Sort into tasks"}
          </button>
        </div>
      </div>
    </section>
  );
}
