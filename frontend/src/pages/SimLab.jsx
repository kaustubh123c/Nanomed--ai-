import { useState } from "react";
import { Crosshair, Layers3 } from "lucide-react";
import BeamSimulation from "../components/BeamSimulation";
import MultiEnergySweep from "../components/MultiEnergySweep";

const TABS = [
  { id: "beam", label: "Beam Simulation", hint: "Single material, live beam", icon: Crosshair },
  { id: "multi", label: "Multi-Material · Multi-Energy", hint: "Up to 8 elements × 200 energies", icon: Layers3 },
];

export default function SimLab() {
  const [tab, setTab] = useState("beam");
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Simulation mode" className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-left text-sm font-semibold transition ${
              tab === id ? "bg-ink text-white shadow" : "text-ink/60 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            <span>
              {label}
              <span className={`block text-[10px] font-normal ${tab === id ? "text-white/60" : "text-ink/40"}`}>{hint}</span>
            </span>
          </button>
        ))}
      </div>
      {tab === "beam" ? <BeamSimulation /> : <MultiEnergySweep />}
    </div>
  );
}
