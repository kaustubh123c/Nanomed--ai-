import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, Sparkles, Trophy } from "lucide-react";
import api from "../lib/api";
import Slider from "../components/Slider";
import Select from "../components/Select";

export default function Planner() {
  const [detectors, setDetectors] = useState([]);
  const [energy, setEnergy] = useState(140);
  const [targetAbsorption, setTargetAbsorption] = useState(80);
  const [detector, setDetector] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/materials/reference-data");
      setDetectors(data.detectors);
      setDetector(data.detectors[0]);
    })();
  }, []);

  const runPlanner = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/planner/plan", {
        energy_kev: energy,
        target_absorption_percent: targetAbsorption,
        detector,
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Planning failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <BrainCircuit className="text-beam" size={26} />
          AI Experiment Planner
        </h1>
        <p className="text-ink/50 text-sm mt-1 max-w-2xl">
          Don't ask "what is the attenuation?" — tell NanoMed AI what attenuation you want to
          achieve, and it recommends the material, thickness, and expected outcome.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Input panel */}
        <div className="glass-panel bg-ink p-6 space-y-6 rounded-2xl h-fit">
          <p className="label-eyebrow">Design Target</p>

          <Slider label="Gamma Energy" value={energy} min={20} max={1300} unit=" keV" onChange={setEnergy} />
          <Slider
            label="Target Absorption"
            value={targetAbsorption}
            min={5}
            max={99}
            unit="%"
            onChange={setTargetAbsorption}
            accent="signal"
          />
          <Select label="Detector" value={detector} onChange={setDetector} options={detectors} />

          <button onClick={runPlanner} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Generate Recommendation
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Output panel */}
        <div className="space-y-5">
          {!result && (
            <div className="glass-panel-light p-10 rounded-2xl text-center text-ink/40 text-sm">
              Set your target absorption and energy, then generate a recommendation.
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="glass-panel-light p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="label-eyebrow text-beam">Recommended Material</p>
                    <h2 className="font-display text-2xl font-semibold text-ink mt-1">
                      {result.recommended_material}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink/50">Confidence</p>
                    <p className="text-2xl font-mono font-semibold text-signal">
                      {(result.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Metric label="Thickness" value={`${result.recommended_thickness_cm} cm`} />
                  <Metric label="Expected Absorption" value={`${result.expected_absorption_percent}%`} />
                  <Metric label="Expected Counts" value={result.expected_counts.toLocaleString()} />
                </div>
              </div>

              <div className="glass-panel-light p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-beam" />
                  <p className="text-xs font-mono uppercase tracking-wide text-ink/50">
                    AI Scientist — Explanation
                  </p>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">{result.scientific_explanation}</p>
              </div>

              <div className="glass-panel-light p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-warn" />
                  <p className="text-xs font-mono uppercase tracking-wide text-ink/50">
                    Alternative Materials
                  </p>
                </div>
                <div className="space-y-2">
                  {result.alternative_materials.map((alt, i) => (
                    <div
                      key={alt.material_name}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-ink/[0.03] border border-ink/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-ink/10 text-ink text-xs font-mono flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-ink">{alt.material_name}</p>
                          <p className="text-xs text-ink/50">{alt.reason}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <p className="text-sm font-mono text-signal">{alt.score}</p>
                        <p className="text-xs text-ink/40">{alt.recommended_thickness_cm} cm</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-ink/[0.03] rounded-xl p-3 border border-ink/10">
      <p className="text-[10px] font-mono uppercase text-ink/40">{label}</p>
      <p className="text-lg font-mono font-semibold text-ink mt-1">{value}</p>
    </div>
  );
}
