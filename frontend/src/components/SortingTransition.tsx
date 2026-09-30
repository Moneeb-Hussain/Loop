const bins = [
  { id: "task", label: "Tasks" },
  { id: "reminder", label: "Reminders" },
  { id: "open_loop", label: "Open loops" },
];

/** Shown while LeMUR extracts items. Words from the ramble drift into bins. */
export function SortingTransition({ transcript }: { transcript: string }) {
  const words = transcript.split(/\s+/).filter((word) => word.length > 3).slice(0, 12);
  return (
    <div className="sorting" role="status" aria-live="polite">
      <div className="sorting-words" aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} style={{ animationDelay: `${index * 0.18}s`, ["--lane" as string]: index % 3 }}>
            {word}
          </span>
        ))}
      </div>
      <div className="sorting-bins" aria-hidden="true">
        {bins.map((bin) => (
          <div key={bin.id} className={`bin tag-${bin.id}`}>
            {bin.label}
          </div>
        ))}
      </div>
      <p>Sorting your thoughts…</p>
    </div>
  );
}
