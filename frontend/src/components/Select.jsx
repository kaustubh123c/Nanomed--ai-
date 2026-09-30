export default function Select({ label, value, onChange, options, getLabel = (o) => o, getValue = (o) => o }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-mono uppercase tracking-wide text-white/50">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-beam outline-none"
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
