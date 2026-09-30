export function UrgencyPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className={`urgency urgency-${value}`} role="radiogroup" aria-label={`Urgency ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={value === level}
          aria-label={`Urgency ${level}`}
          title={`Urgency ${level}`}
          className={level <= value ? "filled" : ""}
          disabled={disabled || !onChange}
          onClick={() => onChange?.(level)}
        />
      ))}
    </span>
  );
}
