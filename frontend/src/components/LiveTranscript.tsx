import { useEffect, useRef } from "react";

export function LiveTranscript({
  transcript,
  partial,
  recording,
  onChange,
  onSubmit,
}: {
  transcript: string;
  partial: string;
  recording: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = liveRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [transcript, partial]);

  if (recording) {
    return (
      <div ref={liveRef} className="transcript live" aria-live="polite" aria-label="Live transcript">
        {transcript || partial ? (
          <>
            {transcript} <span className="partial">{partial}</span>
            <span className="caret" aria-hidden="true" />
          </>
        ) : (
          <span className="placeholder">Start talking. Say everything on your mind, messy is fine.</span>
        )}
      </div>
    );
  }

  return (
    <textarea
      className="transcript"
      value={transcript}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSubmit();
        }
      }}
      aria-label="Transcript"
      placeholder="Dictate or paste a ramble. Example: I need to email Sam about Friday, book the dentist, and I keep worrying about the budget."
      rows={8}
    />
  );
}
