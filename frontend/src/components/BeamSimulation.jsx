import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Play, Pause, RotateCcw, FileDown, Sparkles, Loader2,
  FlaskConical, Radio, Gauge, Target, Database
} from "lucide-react";
import api from "../lib/api";
import Select from "./Select";
import BeamLab from "./BeamLab";

export default function BeamSimulation() {
  const [materials, setMaterials] = useState([]);
  const [detectors, setDetectors] = useState([]);
  const [gammaSources, setGammaSources] = useState([]);
  const [materialId, setMaterialId] = useState("");
  const [detector, setDetector] = useState("");
  const [gammaSource, setGammaSource] = useState("");
  const [energy, setEnergy] = useState(140);
  const [thickness, setThickness] = useState(0.5);
  const [targetAbsorption, setTargetAbsorption] = useState(70);
  const [initialCounts, setInitialCounts] = useState(10000);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({ name: "", formula: "", density: "", atomic_number: "", atomic_mass: "", particle_size_nm: "" });
  const [materialSaveLoading, setMaterialSaveLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const refRes = await api.get("/materials/reference-data");
        const ref = refRes.data || {};
        const dets = ref.detectors || [];
        const sources = ref.gamma_sources || [];
        setDetectors(dets);
        setGammaSources(sources);
        setDetector(dets[0] || "");
        const first = sources[0];
        setGammaSource(first?.name || "");
        setEnergy(first?.energy_kev || 140);
        try {
          const matRes = await api.get("/materials");
          const mats = matRes.data || [];
          setMaterials(mats);
          setMaterialId(mats[0]?.id || "");
        } catch (matErr) {
          setError(matErr?.response?.status === 401 ? "Please log in to load your material library." : "Could not load materials.");
        }
      } catch (e) {
        setError(e?.response?.data?.detail || "Could not load Sim Lab reference data.");
      }
    })();
  }, []);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId),
    [materials, materialId]
  );

  const addMaterial = async (e) => {
    e.preventDefault();
    setMaterialSaveLoading(true);
    setError("");
    try {
      const payload = {
        ...materialForm,
        density: Number(materialForm.density),
        atomic_number: Number(materialForm.atomic_number),
        atomic_mass: Number(materialForm.atomic_mass),
        particle_size_nm: materialForm.particle_size_nm ? Number(materialForm.particle_size_nm) : undefined,
      };
      const { data } = await api.post("/materials", payload);
      setMaterials((prev) => [...prev, data]);
      setMaterialId(data.id);
      setMaterialForm({ name: "", formula: "", density: "", atomic_number: "", atomic_mass: "", particle_size_nm: "" });
      setShowAddMaterial(false);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not add material. Please log in and check the values.");
    } finally {
      setMaterialSaveLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!materialId || !detector || !gammaSource) {
      setError("Select a material, detector and radiation source.");
      return;
    }
    setLoading(true);
    setRunning(true);
    setError("");
    setReportStatus("");
    try {
      const { data } = await api.post("/simlab/run", {
        material_id: materialId,
        detector,
        gamma_source: gammaSource,
        energy_kev: Number(energy),
        thickness_cm: Number(thickness),
        target_absorption_percent: Number(targetAbsorption),
        initial_counts: Number(initialCounts),
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Simulation failed");
      setRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRunning(false);
    setResult(null);
    setError("");
    setReportStatus("");
  };

  const generateReport = async () => {
    if (!result) return;
    setReportStatus("generating");
    try {
      const { data } = await api.post("/reports", {
        title: `Sim Lab — ${result.material_name}`,
        simulation_snapshot: {
          ...result,
          detector,
          gamma_source: gammaSource,
          thickness_cm: thickness,
          target_absorption_percent: targetAbsorption,
          particle_size_nm: selectedMaterial?.particle_size_nm,
          formula: selectedMaterial?.formula,
        },
      });
      const download = await api.get(`/reports/${data.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([download.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.title}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setReportStatus("done");
    } catch {
      setReportStatus("error");
    }
  };

  const chartBars = useMemo(() => {
    if (result?.attenuation_curve?.length) {
      return result.attenuation_curve.map((p) => ({ x: Number(p.thickness_cm), transmission: Number(p.transmission_percent) }));
    }
    return [];
  }, [result]);

  const sourceInfo = gammaSources.find((s) => s.name === gammaSource);

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="label-eyebrow">Virtual Radiation Laboratory</p>
          <h1 className="font-display text-3xl font-semibold text-ink mt-1">NanoMed AI Sim Lab</h1>
          <p className="text-ink/50 text-sm mt-1">
            Nanomaterial gamma-ray interaction, physics calculation and AI-assisted prediction.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-mono text-signal">
          <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
          SIMULATION READY
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[330px_minmax(0,1fr)_330px] gap-5">
        <section className="nm-card p-5 space-y-5 rounded-2xl">
          <div className="flex items-center gap-2">
            <FlaskConical size={17} className="text-beam" />
            <p className="label-eyebrow">Experiment Inputs</p>
          </div>

          <Select
            label="Nanomaterial"
            value={materialId}
            onChange={setMaterialId}
            options={materials}
            getLabel={(m) => m.name}
            getValue={(m) => m.id}
          />

          <button type="button" onClick={() => setShowAddMaterial((v) => !v)} className="w-full rounded-xl border border-beam/30 text-beam px-3 py-2 text-xs font-semibold hover:bg-beam/10 transition">
            {showAddMaterial ? "Close Add Material" : "+ Add Custom Material"}
          </button>

          {showAddMaterial && (
            <form onSubmit={addMaterial} className="rounded-xl border border-ink/12 bg-sage-50 p-3 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wide text-beam">Add material data</p>
              <input required placeholder="Material name" value={materialForm.name} onChange={e => setMaterialForm(v => ({...v, name:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
              <input required placeholder="Formula (e.g. Au)" value={materialForm.formula} onChange={e => setMaterialForm(v => ({...v, formula:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" min="0.0001" step="any" placeholder="Density g/cm³" value={materialForm.density} onChange={e => setMaterialForm(v => ({...v, density:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
                <input required type="number" min="0.0001" step="any" placeholder="Atomic Z" value={materialForm.atomic_number} onChange={e => setMaterialForm(v => ({...v, atomic_number:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" min="0.0001" step="any" placeholder="Atomic/molar mass" value={materialForm.atomic_mass} onChange={e => setMaterialForm(v => ({...v, atomic_mass:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
                <input type="number" min="0.0001" step="any" placeholder="Particle size nm" value={materialForm.particle_size_nm} onChange={e => setMaterialForm(v => ({...v, particle_size_nm:e.target.value}))} className="w-full rounded-lg bg-sage-50 text-ink placeholder-ink/40 px-3 py-2 text-sm border border-ink/12 outline-none" />
              </div>
              <button disabled={materialSaveLoading} className="w-full rounded-lg bg-beam text-white font-semibold py-2 text-sm disabled:opacity-50">{materialSaveLoading ? "Saving…" : "Add Material"}</button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Particle Size" value={`${selectedMaterial?.particle_size_nm ?? "—"} nm`} dark />
            <ReadOnlyField label="Density" value={`${selectedMaterial?.density ?? "—"} g/cm³`} dark />
          </div>

          <Select
            label="Detector"
            value={detector}
            onChange={setDetector}
            options={detectors}
          />

          <Select
            label="Radiation Source"
            value={gammaSource}
            onChange={(val) => {
              setGammaSource(val);
              const src = gammaSources.find((g) => g.name === val);
              if (src) setEnergy(src.energy_kev);
            }}
            options={gammaSources}
            getLabel={(g) => `${g.name} (${g.energy_kev} keV)`}
            getValue={(g) => g.name}
          />

          <Field label="Energy (keV)" value={energy} onChange={setEnergy} min="1" step="1" dark />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Thickness (cm)" value={thickness} onChange={setThickness} min="0.01" step="0.01" dark />
            <Field label="Initial Counts" value={initialCounts} onChange={setInitialCounts} min="1" step="100" dark />
          </div>

          <Field label="Target Absorption (%)" value={targetAbsorption} onChange={setTargetAbsorption} min="1" max="99.9" step="1" dark />

          <div className="rounded-xl border border-ink/12 bg-sage-50 p-3 text-[11px] text-ink/50 leading-relaxed">
            <span className="text-ink/70 font-semibold">Input principle:</span> material properties are
            looked up from the NanoMed library; the backend physics engine and trained models calculate the outputs.
          </div>

          <div className="flex gap-2">
            <button onClick={runSimulation} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
              Run Simulation
            </button>
            <button onClick={reset} className="btn-ghost px-4" title="Reset">
              <RotateCcw size={17} />
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="nm-card p-5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="label-eyebrow">Virtual Radiation Path</p>
                <p className="text-xs text-ink/50 mt-1">{sourceInfo?.name || "Gamma source"} → {selectedMaterial?.name || "Material"} → Detector</p>
              </div>
              <div className="text-[10px] font-mono uppercase text-ink/45">
                {result ? "RESULT READY" : "AWAITING RUN"}
              </div>
            </div>
            <BeamLab
              running={running && !loading}
              transmissionPercent={result ? result.transmission_percent : 100}
              thicknessCm={thickness}
              materialName={selectedMaterial?.name || "Material"}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric icon={<Radio size={15} />} label="Transmission" value={result ? `${result.transmission_percent}%` : "—"} />
            <Metric icon={<Gauge size={15} />} label="Reduction" value={result ? `${result.absorption_percent}%` : "—"} good />
            <Metric icon={<Target size={15} />} label="HVL" value={result ? `${result.half_value_layer_cm} cm` : "—"} />
            <Metric icon={<Database size={15} />} label="Final Counts" value={result ? Number(result.final_counts).toLocaleString() : "—"} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRunning(false)} className="inline-flex items-center gap-2 rounded-xl border border-ink/20 text-ink font-semibold px-5 py-2.5 hover:bg-ink/5 transition">
              <Pause size={16} /> Pause Beam
            </button>
            <button onClick={generateReport} disabled={!result || reportStatus === "generating"} className="inline-flex items-center gap-2 rounded-xl border border-signal/40 text-signal font-semibold px-5 py-2.5 hover:bg-signal/10 transition disabled:opacity-40">
              <FileDown size={16} /> {reportStatus === "generating" ? "Generating…" : "Generate Report"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {reportStatus === "done" && <p className="text-sm text-signal">Report generated and downloaded.</p>}
          {reportStatus === "error" && <p className="text-sm text-red-500">Report generation failed.</p>}

          <section className="glass-panel-light p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="label-eyebrow text-ink/50">Simulation View</p>
                <h2 className="font-display text-lg font-semibold text-ink">Transmission vs Thickness</h2>
              </div>
              <span className="text-xs font-mono text-ink/40">Beer–Lambert view</span>
            </div>
            {!result ? (
              <div className="h-44 grid place-items-center text-sm text-ink/35">Run a simulation to generate the curve.</div>
            ) : (
              <div>
              <div className="h-48 flex items-end gap-2 border border-ink/10 rounded-xl bg-ink/[0.025] px-4 pt-5 pb-7">
                {chartBars.map((b, i) => (
                  <div key={i} className="flex-1 h-full flex items-end relative group">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-olive-600 to-olive-400 transition-all"
                      style={{ height: `${Math.max(5, b.transmission)}%` }}
                      title={`${b.x.toFixed(1)} cm: ${b.transmission.toFixed(1)}%`}
                    />
                    {i % 2 === 0 && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-ink/35">{b.x.toFixed(1)}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink/40">
                <span>Backend-generated attenuation sweep</span>
                <span>Target: {result.target_thickness_cm ?? "—"} cm</span>
              </div>
              </div>
            )}
          </section>
        </section>

        <section className="glass-panel-light p-5 rounded-2xl h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={17} className="text-beam" />
            <p className="label-eyebrow text-ink/55">Physics + AI Results</p>
          </div>

          {!result ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink/40">Run a simulation to see calculated and AI-assisted results.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <ResultRow label="Initial Counts" value={Number(result.initial_counts).toLocaleString()} />
              <ResultRow label="Final Counts" value={Number(result.final_counts).toLocaleString()} />
              <ResultRow label="Transmission" value={`${result.transmission_percent}%`} />
              <ResultRow label="Absorption / Reduction" value={`${result.absorption_percent}%`} highlight />
              <ResultRow label="Linear Attenuation (μ)" value={`${result.linear_attenuation_coefficient} cm⁻¹`} />
              <ResultRow label="Mass Attenuation (μ/ρ)" value={`${result.mass_attenuation_coefficient} cm²/g`} />
              <ResultRow label="Half Value Layer" value={`${result.half_value_layer_cm} cm`} />
              <ResultRow label="Mean Free Path" value={`${result.mean_free_path_cm} cm`} />
              <ResultRow label="Target Thickness" value={`${result.target_thickness_cm ?? "—"} cm`} highlight />

              <div className="pt-4 mt-3 border-t border-ink/10">
                <p className="text-[10px] font-mono uppercase tracking-wider text-ink/40 mb-2">AI thickness prediction</p>
                <div className="rounded-xl bg-beam/10 border border-beam/20 p-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-display font-semibold text-ink">
                        {result.ai_prediction?.estimated_thickness_cm ?? "—"} cm
                      </p>
                      <p className="text-xs text-ink/50 mt-1">Estimated thickness for {targetAbsorption}% target absorption</p>
                    </div>
                    <span className="text-[10px] font-mono text-signal">
                      {result.ai_prediction?.source || "AI"} · {result.ai_prediction?.confidence ? `${Math.round(result.ai_prediction.confidence * 100)}% confidence` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-ink/40 mb-2">AI Scientist</p>
                <p className="text-xs text-ink/65 leading-relaxed">{result.ai_explanation}</p>
              </div>

              {result.ai_recommendation?.top_alternative_materials?.[0] && (
                <div className="rounded-xl bg-ink/[0.035] border border-ink/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-ink/40 mb-1">Top alternative</p>
                  <p className="text-sm font-semibold text-ink">{result.ai_recommendation.top_alternative_materials[0].material_name}</p>
                  <p className="text-xs text-ink/50 mt-1">
                    ~{result.ai_recommendation.top_alternative_materials[0].recommended_thickness_cm} cm for the selected target
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, min, max, step, dark }) {
  return (
    <label className={`block ${dark ? "text-ink/60" : "text-ink/50"} text-xs`}>
      <span className="block mb-1.5">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg px-3 py-2.5 outline-none border transition ${
          dark
            ? "bg-sage-50 border-ink/12 text-ink focus:border-beam/60"
            : "bg-white border-ink/10 text-ink focus:border-beam"
        }`}
      />
    </label>
  );
}

function ReadOnlyField({ label, value, dark }) {
  return (
    <div className={`${dark ? "text-ink/60" : "text-ink/50"} text-xs`}>
      <span className="block mb-1.5">{label}</span>
      <div className={`rounded-lg px-3 py-2.5 border ${dark ? "bg-sage-50 border-ink/12 text-ink/80" : "bg-ink/[0.025] border-ink/10 text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, good }) {
  return (
    <div className="glass-panel-light rounded-xl p-3">
      <div className="flex items-center gap-2 text-ink/40">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className={`font-mono text-lg mt-2 ${good ? "text-signal" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink/50">{label}</span>
      <span className={`text-sm font-mono text-right ${highlight ? "text-signal font-semibold" : "text-ink"}`}>{value}</span>
    </div>
  );
}
