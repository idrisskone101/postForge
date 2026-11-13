export function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = QUARTER_HOURS.includes(value) || !value ? QUARTER_HOURS : [value, ...QUARTER_HOURS].sort();

  return (
    <select
      id={id}
      data-mono="true"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="wb-input"
    >
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}

const QUARTER_HOURS = Array.from({ length: 96 }, (_, index) =>
  [Math.floor(index / 4), (index % 4) * 15].map((part) => String(part).padStart(2, "0")).join(":")
);
