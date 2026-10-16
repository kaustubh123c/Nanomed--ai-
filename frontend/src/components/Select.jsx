export default function Select({ label, value, onChange, options, getLabel = (o) => o, getValue = (o) => o }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nm-input"
      >
        {options.map((o) => (
          <option key={getValue(o)} value={getValue(o)} className="bg-ink text-white">
            {getLabel(o)}
          </option>
        ))}
      </select>
    </div>
  );
}
