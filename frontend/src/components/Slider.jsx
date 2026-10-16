export default function Slider({ label, value, min, max, step = 1, unit = "", onChange, accent = "beam" }) {
  const accentClass = accent === "signal" ? "accent-signal" : "accent-beam";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</label>
        <span className="text-sm font-mono text-ink">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded-full bg-sage-200 appearance-none cursor-pointer ${accentClass}`}
      />
    </div>
  );
}
