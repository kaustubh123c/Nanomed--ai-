import { useEffect, useMemo, useState } from "react";
import { Check, Command, Eye, EyeOff, Keyboard, Moon, Pin, RotateCcw, Save, Sun, StickyNote, Zap } from "lucide-react";

const defaultPins = ["Sim Lab", "Calculator", "Research Studio"];

export default function WorkspaceControlCenter({ navigate }) {
  const [focus, setFocus] = useState(() => localStorage.getItem("nanomed_focus_mode") === "1");
  const [dim, setDim] = useState(() => localStorage.getItem("nanomed_dim_mode") === "1");
  const [note, setNote] = useState(() => localStorage.getItem("nanomed_session_note") || "");
  const [saved, setSaved] = useState(false);
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nanomed_pinned_tools")) || defaultPins; } catch { return defaultPins; }
  });

  useEffect(() => {
    document.body.classList.toggle("nm-focus-mode", focus);
    localStorage.setItem("nanomed_focus_mode", focus ? "1" : "0");
    return () => document.body.classList.remove("nm-focus-mode");
  }, [focus]);

  useEffect(() => {
    document.body.classList.toggle("nm-dim-mode", dim);
    localStorage.setItem("nanomed_dim_mode", dim ? "1" : "0");
    return () => document.body.classList.remove("nm-dim-mode");
  }, [dim]);

  const toolMap = useMemo(() => ({
    "Sim Lab": "/dashboard/sim-lab",
    Calculator: "/dashboard/calculators",
    "Research Studio": "/dashboard/research-studio",
    Materials: "/dashboard/materials",
    Experiments: "/dashboard/experiments",
  }), []);

  const saveNote = () => {
    localStorage.setItem("nanomed_session_note", note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const togglePin = (name) => {
    setPins(prev => {
      const next = prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name].slice(-5);
      localStorage.setItem("nanomed_pinned_tools", JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    setFocus(false); setDim(false); setNote(""); setPins(defaultPins);
    localStorage.removeItem("nanomed_session_note");
    localStorage.setItem("nanomed_pinned_tools", JSON.stringify(defaultPins));
  };

  return <section className="nm-control-center">
    <div className="nm-control-head">
      <div>
        <p className="label-eyebrow">Frontend controls</p>
        <h2 className="font-display text-xl font-semibold text-ink mt-1">Research control center</h2>
        <p className="text-xs text-ink/45 mt-1">Personalize this workspace without changing your research data or backend.</p>
      </div>
      <button onClick={reset} className="nm-control-reset"><RotateCcw size={14}/> Reset UI</button>
    </div>

    <div className="nm-control-grid">
      <button className={`nm-control-card ${focus ? "is-on" : ""}`} onClick={() => setFocus(v => !v)}>
        <div className="nm-control-icon"><Eye size={17}/></div>
        <div><b>Focus mode</b><small>{focus ? "Navigation minimized" : "Reduce workspace distractions"}</small></div>
        <span className="nm-switch"><i /></span>
      </button>
      <button className={`nm-control-card ${dim ? "is-on" : ""}`} onClick={() => setDim(v => !v)}>
        <div className="nm-control-icon"><Moon size={17}/></div>
        <div><b>Research dim</b><small>{dim ? "Lower visual intensity" : "Standard contrast"}</small></div>
        <span className="nm-switch"><i /></span>
      </button>
      <div className="nm-control-card static">
        <div className="nm-control-icon"><Keyboard size={17}/></div>
        <div><b>Keyboard shortcuts</b><small><kbd>Ctrl K</kbd> Command palette · <kbd>Esc</kbd> Close overlays</small></div>
      </div>
    </div>

    <div className="grid lg:grid-cols-[1fr_.85fr] gap-4 mt-4">
      <div className="nm-note-card">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><StickyNote size={16} className="text-sage-600"/><b className="text-sm">Session research note</b></div><button onClick={saveNote} className="nm-save-note">{saved ? <><Check size={13}/> Saved</> : <><Save size={13}/> Save</>}</button></div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Write a quick hypothesis, next step, observation, or reminder…" className="nm-session-note" maxLength={500}/>
        <div className="text-[10px] text-slate-400 text-right">{note.length}/500 · stored locally in this browser</div>
      </div>
      <div className="nm-pins-card">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Pin size={15} className="text-sage-600"/><b className="text-sm">Pinned tools</b></div><span className="text-[10px] text-slate-400">up to 5</span></div>
        <div className="flex flex-wrap gap-2 mt-4">{pins.map(name => <button key={name} onClick={() => navigate(toolMap[name])} className="nm-pin">{name}<span>→</span></button>)}{pins.length < 5 && Object.keys(toolMap).filter(x => !pins.includes(x)).slice(0, 2).map(name => <button key={name} onClick={() => togglePin(name)} className="nm-pin ghost"><Zap size={12}/> Pin {name}</button>)}</div>
      </div>
    </div>

    <div className="nm-control-footer"><span><Command size={13}/> Tip: use <strong>Ctrl + K</strong> anywhere to jump between tools.</span><span className="hidden sm:inline-flex items-center gap-1.5"><Sun size={12}/> UI preferences are frontend-only</span></div>
  </section>;
}
