import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Calculator,
  Beaker,
  Ruler,
  Loader2,
  Atom,
  LineChart,
  Layers,
  Plus,
  X,
  Shield,
  RotateCcw,
  Download,
  FileJson,
  Printer,
  Info,
  AlertTriangle,
  CheckCircle2,
  Bot,
  History,
  Save,
  Eye,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import api from "../lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// --------------------------------------------------------------------
// Main Calculators Page
// --------------------------------------------------------------------

const TABS = [
  {
    key: "quick",
    label: "Quick Formulas",
    hint: "Density & thickness",
    icon: Calculator,
  },
  {
    key: "compare",
    label: "Compare Materials",
    hint: "Multi-material chart",
    icon: Layers,
  },
  {
    key: "shielding",
    label: "Shielding Calculator",
    hint: "Full physics breakdown",
    icon: Shield,
  },
];

export default function Calculators() {
  const [activeTab, setActiveTab] = useState("quick");
  const [researchMode, setResearchMode] = useState(() => localStorage.getItem("nanomed_research_mode") === "true");
  const toggleResearchMode = () => setResearchMode(v => { const next = !v; localStorage.setItem("nanomed_research_mode", String(next)); return next; });

  return (
    <div className="space-y-6">
      <div className="glass-panel-light rounded-2xl p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-beam/10 border border-beam/30 flex items-center justify-center">
            <Calculator className="text-beam" size={22} />
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Calculators
            </h1>

            <p className="text-ink/50 text-sm mt-1 max-w-2xl">
              Standalone tools for the formulas researchers reach for
              most often, a side-by-side material comparison chart, and
              the full Radiation Shielding Calculator for a single
              chemical formula — pick a tool below to get started.
            </p>
          </div>
          </div>
          <button type="button" onClick={toggleResearchMode} className={`nm-mode-toggle ${researchMode ? "is-active" : ""}`}>
            <span className="nm-mode-dot" />
            <span><b>{researchMode ? "Research Mode" : "Standard Mode"}</b><small>{researchMode ? "Detailed analysis enabled" : "Focused workspace"}</small></span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Calculator tools"
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-beam bg-beam/10 shadow-[0_0_24px_rgba(0,194,255,.12)]"
                    : "border-ink/10 bg-white/60 hover:bg-white hover:border-ink/20"
                }`}
              >
                <div
                  className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border ${
                    isActive
                      ? "bg-beam text-ink border-beam"
                      : "bg-white text-ink/40 border-ink/10"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isActive ? "text-ink" : "text-ink/70"
                    }`}
                  >
                    {tab.label}
                  </p>
                  <p className="text-xs text-ink/45 truncate">
                    {tab.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {researchMode && (
        <div className="nm-research-strip">
          <div className="flex items-center gap-3"><div className="nm-strip-icon"><Atom size={16}/></div><div><p className="text-sm font-semibold">Research workspace enabled</p><p className="text-xs opacity-60">Use saved materials, compare outputs, inspect physics details and preserve your analysis workflow.</p></div></div>
          <span className="nm-chip">ANALYSIS MODE</span>
        </div>
      )}

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {activeTab === "quick" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <DensityCalculator />
              <ThicknessCalculator />
              <UnitConverter />
            </div>
            <CalculationHistoryPanel />
          </div>
        )}

        {activeTab === "compare" && <MaterialComparisonPanel />}

        {activeTab === "shielding" && <RadiationShieldingCalculator />}
      </motion.div>
    </div>
  );
}

function UnitConverter() {
  const [value, setValue] = useState("1");
  const [mode, setMode] = useState("energy");
  const [from, setFrom] = useState("MeV");
  const [to, setTo] = useState("keV");
  const numeric = parseFloat(value);
  const energyFactors = { eV: 1e-6, keV: 1e-3, MeV: 1, GeV: 1e3 };
  const lengthFactors = { "µm": 1e-4, mm: 0.1, cm: 1, m: 100 };
  const factors = mode === "energy" ? energyFactors : lengthFactors;
  const output = Number.isFinite(numeric) ? numeric * factors[from] / factors[to] : NaN;
  return <div className="glass-panel-light rounded-2xl p-5">
    <div className="flex items-center gap-2 mb-4"><ArrowUpRight size={16} className="text-beam"/><div><p className="font-display font-semibold text-ink">Unit converter</p><p className="text-[11px] text-ink/40">Fast energy and thickness conversions.</p></div></div>
    <div className="flex gap-2 mb-3"><button type="button" onClick={()=>{setMode("energy");setFrom("MeV");setTo("keV")}} className={`text-xs px-3 py-1.5 rounded-lg border ${mode==="energy"?"border-beam bg-beam/10":"border-ink/10"}`}>Energy</button><button type="button" onClick={()=>{setMode("length");setFrom("cm");setTo("mm")}} className={`text-xs px-3 py-1.5 rounded-lg border ${mode==="length"?"border-beam bg-beam/10":"border-ink/10"}`}>Length</button></div>
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center"><input type="number" step="any" value={value} onChange={e=>setValue(e.target.value)} className="bg-white border border-ink/10 rounded-xl px-3 py-2.5 text-sm"/><select value={from} onChange={e=>setFrom(e.target.value)} className="bg-white border border-ink/10 rounded-xl px-2 py-2.5 text-xs">{Object.keys(factors).map(x=><option key={x}>{x}</option>)}</select><span className="text-ink/30">→</span><select value={to} onChange={e=>setTo(e.target.value)} className="bg-white border border-ink/10 rounded-xl px-2 py-2.5 text-xs">{Object.keys(factors).map(x=><option key={x}>{x}</option>)}</select></div>
    <div className="mt-4 rounded-xl bg-ink text-white p-3"><p className="text-[10px] text-white/40 uppercase tracking-wide">Converted value</p><p className="font-mono text-lg mt-1">{Number.isFinite(output)?output.toLocaleString(undefined,{maximumFractionDigits:8}):"—"} <span className="text-xs text-white/50">{to}</span></p></div>
  </div>;
}

function CalculationHistoryPanel() {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem("nanomed_calculation_history") || "[]"); } catch { return []; } });
  const clear = () => { localStorage.removeItem("nanomed_calculation_history"); setItems([]); };
  return <div className="glass-panel-light rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><History size={17} className="text-beam"/><div><h3 className="font-display font-semibold">Calculation history</h3><p className="text-[11px] text-ink/40">Saved locally for this signed-in browser.</p></div></div>{items.length>0&&<button onClick={clear} className="text-xs text-red-500 flex items-center gap-1"><Trash2 size={13}/> Clear</button>}</div>{items.length?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{items.slice(0,6).map((x,i)=><div key={x.id||i} className="rounded-xl border border-ink/10 bg-white/70 p-4"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{x.material||"Material"}</p><p className="font-mono text-[10px] text-beam mt-1">{x.energy} MeV · {x.thickness} cm</p></div><Save size={14} className="text-ink/25"/></div><p className="text-[10px] text-ink/40 mt-3">{x.createdAt?new Date(x.createdAt).toLocaleString():"Saved"}</p></div>)}</div>:<div className="py-6 text-center text-xs text-ink/35">No saved calculations yet. Run the shielding calculator to create history.</div>}</div>;
}

function ReportPreview({ calc, formula, onClose, onPrint }) {
  const fields = [["MAC","mac_cm2_g","cm²/g"],["LAC","lac_cm1","cm⁻¹"],["HVL","hvl_cm","cm"],["TVL","tvl_cm","cm"],["MFP","mfp_cm","cm"],["Zeff","zeff",""],["Zeq","zeq",""],["RSE","rse_percent","%"],["EBF","ebf",""],["EABF","eabf",""]];
  return <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto"><div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden"><div className="p-6 border-b border-ink/10 flex items-center justify-between"><div><p className="label-eyebrow">NanoMed-AI report</p><h2 className="font-display text-2xl font-semibold mt-1">Radiation Shielding Analysis</h2><p className="text-xs text-ink/45 mt-1">{new Date().toLocaleString()}</p></div><div className="flex gap-2"><button onClick={onPrint} className="px-3 py-2 rounded-xl bg-beam/10 text-beam text-xs font-semibold flex items-center gap-1"><Printer size={14}/> Print</button><button onClick={onClose} className="px-3 py-2 rounded-xl bg-black/5 text-xs"><X size={14}/></button></div></div><div className="p-6 space-y-5"><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><SummaryBox label="Material" value={calc.formula||formula}/><SummaryBox label="Energy" value={`${calc.energy_MeV} MeV`}/><SummaryBox label="Density" value={`${calc.density_g_cm3} g/cm³`}/><SummaryBox label="Thickness" value={`${calc.thickness_cm} cm`}/></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{fields.map(([label,key,unit])=><ResultCard key={key} label={label} value={calc[key]} unit={unit} unavailable={calc[key]===null||calc[key]===undefined}/>)}</div><div className="rounded-2xl border border-ink/10 bg-slate-50 p-4"><p className="text-xs font-semibold">Interpretation</p><p className="text-xs text-ink/55 leading-relaxed mt-2">This preview contains the values returned by the configured NanoMed-AI shielding calculation engine. Verify source conditions and material density before using results for research or engineering decisions.</p></div></div></div></div>;
}

// --------------------------------------------------------------------
// Density Formula: rho = mass / volume
// --------------------------------------------------------------------

function DensityCalculator() {
  const [mass, setMass] = useState("23");
  const [volume, setVolume] = useState("5");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculate = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const { data } = await api.post("/calculators/density", {
        mass_g: parseFloat(mass),
        volume_cm3: parseFloat(volume),
      });

      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not calculate density"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={calculate}
      className="glass-panel-light p-6 rounded-2xl space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-beam/10 border border-beam/30 flex items-center justify-center">
          <Calculator className="text-beam" size={16} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-ink leading-tight">
            Density Formula
          </h2>
          <p className="text-xs text-ink/40 font-mono">ρ = m / V</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Mass (g)" value={mass} onChange={setMass} />
        <Field label="Volume (cm³)" value={volume} onChange={setVolume} />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Calculator size={18} />
        )}
        {loading ? "Calculating…" : "Calculate Density"}
      </button>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-beam/10 border border-beam/20 p-4"
        >
          <p className="text-xs text-ink/50 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-signal" />
            Calculated Density
          </p>

          <p className="text-2xl font-mono font-semibold text-ink mt-1">
            {result.density_g_cm3}{" "}
            <span className="text-sm text-ink/50">g/cm³</span>
          </p>

          <p className="text-xs text-ink/50 mt-2">
            You can use this value as a Custom material's density in Sim Lab
            or the Shielding Calculator.
          </p>
        </motion.div>
      )}
    </form>
  );
}

// --------------------------------------------------------------------
// Required Thickness Calculator
// x = -ln(I / I0) / mu
// --------------------------------------------------------------------

function ThicknessCalculator() {
  const [i0, setI0] = useState("1000");
  const [i, setI] = useState("100");
  const [mu, setMu] = useState("0.5");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculate = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const { data } = await api.post("/calculators/thickness", {
        initial_intensity: parseFloat(i0),
        final_intensity: parseFloat(i),
        mu: parseFloat(mu),
      });

      setResult(data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not calculate thickness"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={calculate}
      className="glass-panel-light p-6 rounded-2xl space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-beam/10 border border-beam/30 flex items-center justify-center">
          <Ruler className="text-beam" size={16} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-ink leading-tight">
            Thickness Calculator
          </h2>
          <p className="text-xs text-ink/40 font-mono">x = -ln(I / I₀) / μ</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Initial (I₀)" value={i0} onChange={setI0} />
        <Field label="Final (I)" value={i} onChange={setI} />
        <Field
          label="μ (cm⁻¹)"
          value={mu}
          onChange={setMu}
          step="0.000001"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Ruler size={18} />
        )}
        {loading ? "Calculating…" : "Calculate Required Thickness"}
      </button>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-beam/10 border border-beam/20 p-4"
        >
          <p className="text-xs text-ink/50 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-signal" />
            Required Thickness
          </p>

          <p className="text-2xl font-mono font-semibold text-ink mt-1">
            {result.required_thickness_cm}{" "}
            <span className="text-sm text-ink/50">cm</span>
          </p>

          <p className="text-xs text-ink/50 mt-2">
            Minimum shield thickness needed to attenuate I₀ down to your
            target I at this μ.
          </p>
        </motion.div>
      )}
    </form>
  );
}

// --------------------------------------------------------------------
// Advanced Sweep Chart
// --------------------------------------------------------------------

function AdvancedSweepChart({ sweep, thicknessCm }) {
  const points = sweep.results.filter(
    (r) => r.status === "calculated"
  );

  const labels = points.map((r) => r.energy_MeV);

  const macValues = points.map(
    (r) => r.calculation.mac_cm2_g
  );

  const rseValues = points.map(
    (r) => r.calculation.rse_percent
  );

  const data = {
    labels,
    datasets: [
      {
        label: "MAC (cm²/g)",
        data: macValues,
        borderColor: "#00C2FF",
        backgroundColor: "#00C2FF",
        yAxisID: "y",
        tension: 0.25,
      },
      {
        label: `Attenuation at ${thicknessCm} cm (%)`,
        data: rseValues,
        borderColor: "#10B981",
        backgroundColor: "#10B981",
        yAxisID: "y1",
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: "#0B1F3A",
          font: { family: "Inter" },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Energy (MeV)",
          color: "#64748b",
        },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        type: "linear",
        position: "left",
        title: {
          display: true,
          text: "MAC (cm²/g)",
          color: "#64748b",
        },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
      y1: {
        type: "linear",
        position: "right",
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Attenuation (%)",
          color: "#64748b",
        },
        ticks: { color: "#64748b" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return <Line data={data} options={options} />;
}

// --------------------------------------------------------------------
// Energy Trend Analysis (ported from Physics-AI)
// A selectable parameter-vs-energy trend chart with an auto-generated
// observation, plus HVL vs TVL, MAC vs LAC, and RSE vs Energy
// relationship charts — all driven by the single-formula energy sweep.
// --------------------------------------------------------------------

const ENERGY_ANALYSIS_CONFIG = {
  mac: { label: "MAC", unit: "cm²/g", rowKey: "mac" },
  lac: { label: "LAC", unit: "cm⁻¹", rowKey: "lac" },
  hvl: { label: "HVL", unit: "cm", rowKey: "hvl" },
  tvl: { label: "TVL", unit: "cm", rowKey: "tvl" },
  mfp: { label: "MFP", unit: "cm", rowKey: "mfp" },
  rse: { label: "RSE", unit: "%", rowKey: "rse" },
};

function sweepToRows(sweep) {
  if (!sweep?.results) return [];

  return sweep.results
    .filter((r) => r.status === "calculated" && r.calculation)
    .map((r) => ({
      energy: Number(r.energy_MeV),
      mac: Number(r.calculation.mac_cm2_g),
      lac: Number(r.calculation.lac_cm1),
      hvl: Number(r.calculation.hvl_cm),
      tvl: Number(r.calculation.tvl_cm),
      mfp: Number(r.calculation.mfp_cm),
      rse: Number(r.calculation.rse_percent),
    }))
    .filter((row) => Number.isFinite(row.energy));
}

function selectRepresentativeRows(rows, count) {
  if (rows.length <= count) return rows.slice();

  const selected = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    const rawIndex = Math.round((i * (rows.length - 1)) / (count - 1));
    let index = rawIndex;

    while (used.has(index) && index < rows.length - 1) index++;
    while (used.has(index) && index > 0) index--;

    if (!used.has(index)) {
      used.add(index);
      selected.push(rows[index]);
    }
  }

  return selected;
}

function buildTrendObservation(rows, key, label, unit) {
  const values = rows
    .map((r) => r[key])
    .filter((v) => Number.isFinite(v));

  if (values.length < 2) {
    return "There isn't enough calculated data yet to determine an overall trend.";
  }

  let increasing = true;
  let decreasing = true;

  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) increasing = false;
    if (values[i] > values[i - 1]) decreasing = false;
  }

  const first = values[0];
  const last = values[values.length - 1];

  if (increasing || decreasing) {
    const direction = increasing ? "increases" : "decreases";

    return `${label} ${direction} across the selected energy points, from approximately ${first.toPrecision(
      5
    )} ${unit} to ${last.toPrecision(5)} ${unit}.`;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const finalRelation =
    last > first ? "higher" : last < first ? "lower" : "similar";

  return `${label} does not follow one overall monotonic trend in this range. The final value is ${finalRelation} than the first, with calculated values spanning approximately ${minimum.toPrecision(
    5
  )}–${maximum.toPrecision(5)} ${unit}.`;
}

function pointChartOptions(xTitle, yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${yTitle}: ${Number(ctx.parsed.y).toPrecision(6)}`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xTitle, color: "#64748b" },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        title: { display: true, text: yTitle, color: "#64748b" },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
    },
  };
}

function PointLineChart({ points, xLabel, yLabel, color = "#00C2FF", height = 220 }) {
  if (!points.length) {
    return (
      <p className="text-xs text-ink/40 py-10 text-center">
        Not enough calculated points to plot this relationship.
      </p>
    );
  }

  const data = {
    datasets: [
      {
        data: points,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.25,
        fill: false,
      },
    ],
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={pointChartOptions(xLabel, yLabel)} />
    </div>
  );
}

function EnergyTrendAnalysis({ sweep }) {
  const [param, setParam] = useState("mac");
  const [pointMode, setPointMode] = useState("10");

  const rows = sweepToRows(sweep);

  if (!rows.length) return null;

  const config = ENERGY_ANALYSIS_CONFIG[param];

  const selectedRows =
    pointMode === "10" ? selectRepresentativeRows(rows, 10) : rows;

  const trendPoints = selectedRows
    .map((r) => ({ x: r.energy, y: r[config.rowKey] }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const hvlTvlPoints = rows
    .map((r) => ({ x: r.hvl, y: r.tvl }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const macLacPoints = rows
    .map((r) => ({ x: r.mac, y: r.lac }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const rseEnergyPoints = rows
    .map((r) => ({ x: r.energy, y: r.rse }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const observation = buildTrendObservation(
    selectedRows,
    config.rowKey,
    config.label,
    config.unit
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-beam/10 border border-beam/30 flex items-center justify-center">
          <LineChart className="text-beam" size={16} />
        </div>
        <div>
          <h3 className="font-display font-semibold text-ink leading-tight">
            Energy Trend Analysis
          </h3>
          <p className="text-xs text-ink/45">
            Compare calculated shielding parameters across energy.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Parameter
          </label>

          <select
            value={param}
            onChange={(e) => setParam(e.target.value)}
            className="bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
          >
            {Object.entries(ENERGY_ANALYSIS_CONFIG).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label} — {c.unit || "dimensionless"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Energy points
          </label>

          <select
            value={pointMode}
            onChange={(e) => setPointMode(e.target.value)}
            className="bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
          >
            <option value="10">10 representative points</option>
            <option value="all">All {rows.length} points</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
        <PointLineChart
          points={trendPoints}
          xLabel="Photon Energy (MeV)"
          yLabel={`${config.label}${config.unit ? ` (${config.unit})` : ""}`}
          color="#00C2FF"
          height={280}
        />
      </div>

      <div className="rounded-xl bg-beam/10 border border-beam/20 p-4 text-sm text-ink/70 leading-relaxed">
        <span className="font-semibold text-ink">Observation — </span>
        {observation}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Relationship — HVL vs TVL
          </p>
          <PointLineChart
            points={hvlTvlPoints}
            xLabel="HVL (cm)"
            yLabel="TVL (cm)"
            color="#10B981"
          />
        </div>

        <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Relationship — MAC vs LAC
          </p>
          <PointLineChart
            points={macLacPoints}
            xLabel="MAC (cm²/g)"
            yLabel="LAC (cm⁻¹)"
            color="#F59E0B"
          />
        </div>

        <div className="rounded-xl border border-ink/10 bg-white/70 p-4 md:col-span-2">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Effectiveness — RSE vs Energy
          </p>
          <PointLineChart
            points={rseEnergyPoints}
            xLabel="Photon Energy (MeV)"
            yLabel="RSE (%)"
            color="#8B5CF6"
            height={240}
          />
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Energy Trend Analysis — 8-material comparison variant
// Same idea as EnergyTrendAnalysis, but one series per material so you
// can see how the selected parameter and each relationship differ
// across "this formula" plus up to 7 library materials.
// --------------------------------------------------------------------

function multiPointChartOptions(xTitle, yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#0B1F3A",
          font: { family: "Inter", size: 11 },
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${Number(ctx.parsed.y).toPrecision(6)}`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: xTitle, color: "#64748b" },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
      y: {
        title: { display: true, text: yTitle, color: "#64748b" },
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
      },
    },
  };
}

function MultiPointLineChart({ datasets, xLabel, yLabel, height = 260 }) {
  const hasData = datasets.some((d) => d.data.length > 0);

  if (!hasData) {
    return (
      <p className="text-xs text-ink/40 py-10 text-center">
        Not enough calculated points to plot this relationship.
      </p>
    );
  }

  return (
    <div style={{ height }}>
      <Line
        data={{ datasets }}
        options={multiPointChartOptions(xLabel, yLabel)}
      />
    </div>
  );
}

function MultiEnergyTrendAnalysis({ materials }) {
  const [param, setParam] = useState("mac");

  if (!materials?.length) return null;

  const config = ENERGY_ANALYSIS_CONFIG[param];

  const perMaterial = materials.map((m, idx) => ({
    name: m.name,
    color: SERIES_COLORS[idx % SERIES_COLORS.length],
    rows: sweepToRows(m.sweep),
  }));

  const toSeries = (mapRow) =>
    perMaterial.map((m) => ({
      label: m.name,
      data: m.rows.map(mapRow).filter(
        (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
      ),
      borderColor: m.color,
      backgroundColor: m.color,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.25,
      fill: false,
    }));

  const trendDatasets = toSeries((r) => ({
    x: r.energy,
    y: r[config.rowKey],
  }));

  const hvlTvlDatasets = toSeries((r) => ({ x: r.hvl, y: r.tvl }));
  const macLacDatasets = toSeries((r) => ({ x: r.mac, y: r.lac }));
  const rseEnergyDatasets = toSeries((r) => ({ x: r.energy, y: r.rse }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-beam/10 border border-beam/30 flex items-center justify-center">
          <Layers className="text-beam" size={16} />
        </div>
        <div>
          <h3 className="font-display font-semibold text-ink leading-tight">
            Energy Trend Analysis — {perMaterial.length} Materials
          </h3>
          <p className="text-xs text-ink/45">
            Compare the selected parameter and key relationships across
            all {perMaterial.length} materials at once.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
          Parameter
        </label>

        <select
          value={param}
          onChange={(e) => setParam(e.target.value)}
          className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
        >
          {Object.entries(ENERGY_ANALYSIS_CONFIG).map(([key, c]) => (
            <option key={key} value={key}>
              {c.label} — {c.unit || "dimensionless"}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
        <MultiPointLineChart
          datasets={trendDatasets}
          xLabel="Photon Energy (MeV)"
          yLabel={`${config.label}${config.unit ? ` (${config.unit})` : ""}`}
          height={300}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Relationship — HVL vs TVL
          </p>
          <MultiPointLineChart
            datasets={hvlTvlDatasets}
            xLabel="HVL (cm)"
            yLabel="TVL (cm)"
          />
        </div>

        <div className="rounded-xl border border-ink/10 bg-white/70 p-4">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Relationship — MAC vs LAC
          </p>
          <MultiPointLineChart
            datasets={macLacDatasets}
            xLabel="MAC (cm²/g)"
            yLabel="LAC (cm⁻¹)"
          />
        </div>

        <div className="rounded-xl border border-ink/10 bg-white/70 p-4 md:col-span-2">
          <p className="text-xs font-semibold text-ink/70 mb-2">
            Effectiveness — RSE vs Energy
          </p>
          <MultiPointLineChart
            datasets={rseEnergyDatasets}
            xLabel="Photon Energy (MeV)"
            yLabel="RSE (%)"
            height={280}
          />
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Material Comparison
// --------------------------------------------------------------------

const FIXED_COMPARISON_ENERGIES_MEV = [
  0.1,
  0.15,
  0.2,
  0.3,
  0.5,
  0.662,
  1.0,
  1.25,
];

const COMPARISON_QUANTITIES = [
  {
    key: "mac_cm2_g",
    label: "MAC (Mass Attenuation Coeff.)",
    unit: "cm²/g",
    needsThickness: false,
  },
  {
    key: "lac_cm1",
    label: "LAC (Linear Attenuation Coeff.)",
    unit: "cm⁻¹",
    needsThickness: false,
  },
  {
    key: "hvl_cm",
    label: "HVL (Half Value Layer)",
    unit: "cm",
    needsThickness: false,
  },
  {
    key: "tvl_cm",
    label: "TVL (Tenth Value Layer)",
    unit: "cm",
    needsThickness: false,
  },
  {
    key: "mfp_cm",
    label: "MFP (Mean Free Path)",
    unit: "cm",
    needsThickness: false,
  },
  {
    key: "rse_percent",
    label: "RSE (Shielding Efficiency)",
    unit: "%",
    needsThickness: true,
  },
  {
    key: "zeff",
    label: "Zeff (Effective Atomic Number)",
    unit: "",
    needsThickness: false,
  },
  {
    key: "zeq",
    label: "Zeq (Equivalent Atomic Number)",
    unit: "",
    needsThickness: false,
  },
  {
    key: "neff",
    label: "Neff (Effective Electron Density)",
    unit: "e⁻/g",
    needsThickness: false,
  },
  {
    key: "ceff_S_m",
    label: "Ceff (Effective Conductivity)",
    unit: "S/m",
    needsThickness: false,
  },
  {
    key: "acs_cm2_atom",
    label: "ACS (Atomic Cross Section)",
    unit: "cm²/atom",
    needsThickness: false,
  },
  {
    key: "ecs_cm2_electron",
    label: "ECS (Electronic Cross Section)",
    unit: "cm²/e⁻",
    needsThickness: false,
  },
  {
    key: "fnrcs_cm1",
    label: "FNRCS (Fast Neutron Removal)",
    unit: "cm⁻¹",
    needsThickness: false,
  },
  {
    key: "ebf",
    label: "EBF (Exposure Buildup Factor)",
    unit: "",
    needsThickness: false,
  },
  {
    key: "eabf",
    label: "EABF (Energy-Absorption Buildup)",
    unit: "",
    needsThickness: false,
  },
];

const SERIES_COLORS = [
  "#6B705C",
  "#7A8B5B",
  "#A65D3A",
  "#8A6A4A",
  "#9B4F45",
  "#59604D",
  "#87956E",
  "#B46A3C",
];

let rowIdCounter = 0;

const newRow = () => ({
  uid: ++rowIdCounter,
  mode: "custom",
  materialId: "",
  name: "",
  formula: "",
  density: "",
});

function MaterialComparisonPanel() {
  const [library, setLibrary] = useState([]);
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, newRow));
  const [quantityKey, setQuantityKey] = useState("mac_cm2_g");
  const [thickness, setThickness] = useState("1.0");
  const [dataSource, setDataSource] = useState("offline");
  const [chart, setChart] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/materials")
      .then((res) => setLibrary(res.data || []))
      .catch(() => setLibrary([]));
  }, []);

  const quantity = COMPARISON_QUANTITIES.find(
    (q) => q.key === quantityKey
  );

  const updateRow = (uid, patch) => {
    setRows((prev) =>
      prev.map((r) =>
        r.uid === uid ? { ...r, ...patch } : r
      )
    );
  };



  const rowFormulaDensity = (row) => {
    if (row.mode === "library") {
      const mat = library.find((m) => m.id === row.materialId);
      return mat && Number.isFinite(Number(mat.density))
        ? { name: mat.name, formula: mat.formula, density: Number(mat.density) }
        : null;
    }

    const formula = String(row.formula || "").trim();
    const density = Number(row.density);
    if (!formula || !Number.isFinite(density) || density <= 0) return null;

    return {
      name: String(row.name || formula).trim() || formula,
      formula,
      density,
    };
  };

  const runComparison = async (e) => {
    e.preventDefault();

    setError("");
    setChart(null);

    const resolved = rows.map(rowFormulaDensity);

    if (resolved.some((r) => !r)) {
      setError(
        "Every row needs either a selected library material or a formula + density."
      );
      return;
    }

    await executeComparison(resolved, quantityKey);
  };



  const executeComparison = async (resolved, key) => {
    const quantityUsed = COMPARISON_QUANTITIES.find((q) => q.key === key);
    setLoading(true);
    setError("");

    try {
      const requestSweep = async (mat, source) => {
        const response = await api.post("/calculators/advanced/sweep", {
          formula: mat.formula,
          density_g_cm3: mat.density,
          thickness_cm: Number.isFinite(Number(thickness)) && Number(thickness) > 0 ? Number(thickness) : 1,
          energies_MeV: FIXED_COMPARISON_ENERGIES_MEV,
          data_source: source,
        });
        return response.data;
      };

      const responses = await Promise.allSettled(
        resolved.map(async (mat) => {
          try {
            const sweep = await requestSweep(mat, dataSource);
            const calculated = (sweep?.results || []).filter((item) => item.status === "calculated").length;
            // If XCOM is selected but returns no usable points, retry the same
            // manual material with the local/offline physics source.
            if (calculated === 0 && dataSource === "xcom") {
              const fallback = await requestSweep(mat, "offline");
              return { sweep: fallback, usedSource: "offline" };
            }
            return { sweep, usedSource: dataSource };
          } catch (primaryError) {
            if (dataSource === "xcom") {
              const fallback = await requestSweep(mat, "offline");
              return { sweep: fallback, usedSource: "offline" };
            }
            throw primaryError;
          }
        })
      );

      const failures = responses.filter((r) => r.status === "rejected");
      const successful = responses
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => r.status === "fulfilled");

      if (!successful.length) {
        const first = failures[0]?.reason;
        throw new Error(first?.response?.data?.detail || first?.message || "No material comparison could be calculated.");
      }

      const datasets = successful.map(({ r, idx }, seriesIndex) => {
        const mat = resolved[idx];
        const sweep = r.value.sweep;
        const values = FIXED_COMPARISON_ENERGIES_MEV.map((energy) => {
          const point = sweep?.results?.find((item) => Number(item.energy_MeV) === Number(energy));
          const value = point?.status === "calculated" ? point.calculation?.[key] : null;
          return Number.isFinite(Number(value)) ? Number(value) : null;
        });

        return {
          label: `${mat.name} (${quantityUsed.label})`,
          data: values,
          borderColor: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
          backgroundColor: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
        };
      });

      const usablePoints = datasets.reduce(
        (sum, dataset) => sum + dataset.data.filter((value) => value !== null).length,
        0
      );

      if (usablePoints === 0) {
        throw new Error("The 8 materials were submitted, but no calculation values were returned. Check each chemical formula and density.");
      }

      setChart({ labels: FIXED_COMPARISON_ENERGIES_MEV, datasets });

      if (failures.length) {
        setError(`${failures.length} material${failures.length > 1 ? "s" : ""} could not be calculated; the remaining results are shown.`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Could not run the material comparison");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={runComparison}
      className="glass-panel-light p-6 rounded-2xl space-y-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-beam/10 border border-beam/30 flex items-center justify-center">
            <Layers className="text-beam" size={16} />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink leading-tight">
              Material Comparison Across Energy Levels
            </h2>
            <p className="text-xs text-ink/45 mt-0.5">
              Compares materials on one physics quantity across{" "}
              {FIXED_COMPARISON_ENERGIES_MEV.length} standard gamma
              energies ({FIXED_COMPARISON_ENERGIES_MEV.join(", ")} MeV).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRows(Array.from({ length: 8 }, newRow))}
          disabled={loading}
          className="text-xs px-3 py-2.5 rounded-xl border border-beam/40 text-ink hover:bg-beam/10 transition flex items-center gap-1.5 shrink-0"
        >
          <Layers size={14} />
          Reset to 8 Manual Slots
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.uid}
            className="flex flex-wrap items-end gap-3 bg-white/60 border border-ink/5 rounded-xl p-3 transition hover:border-ink/10"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
                Source
              </label>

              <div className="flex gap-1">
                {["library", "custom"].map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() =>
                      updateRow(row.uid, { mode: m })
                    }
                    className={`text-xs px-2.5 py-2 rounded-lg border ${
                      row.mode === m
                        ? "border-beam bg-beam/10 text-ink"
                        : "border-ink/15 text-ink/50"
                    }`}
                  >
                    {m === "library"
                      ? "Saved Material"
                      : "Custom Formula"}
                  </button>
                ))}
              </div>
            </div>

            {row.mode === "library" ? (
              <div className="space-y-1.5 min-w-[220px]">
                <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
                  Material
                </label>

                <select
                  value={row.materialId}
                  onChange={(e) =>
                    updateRow(row.uid, {
                      materialId: e.target.value,
                    })
                  }
                  required
                  className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
                >
                  <option value="">Select…</option>

                  {library.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.formula})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 min-w-[150px]">
                  <label className="text-xs font-mono uppercase tracking-wide text-ink/50">Material Name</label>
                  <input type="text" value={row.name} onChange={(e) => updateRow(row.uid, { name: e.target.value })} placeholder={`Material ${rows.indexOf(row) + 1}`} className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wide text-ink/50">Formula</label>
                  <input type="text" value={row.formula} onChange={(e) => updateRow(row.uid, { formula: e.target.value })} placeholder="e.g. Bi2O3" required className="w-32 bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wide text-ink/50">Density (g/cm³)</label>
                  <input type="number" min="0.000001" step="any" value={row.density} onChange={(e) => updateRow(row.uid, { density: e.target.value })} placeholder="e.g. 8.90" required className="w-28 bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none" />
                </div>
              </>
            )}


          </div>
        ))}

        <p className="text-[11px] text-ink/40">Enter all 8 materials manually. Each material requires a chemical formula and density; the name is used only for the chart legend.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5 col-span-2">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Quantity
          </label>

          <select
            value={quantityKey}
            onChange={(e) =>
              setQuantityKey(e.target.value)
            }
            className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
          >
            {COMPARISON_QUANTITIES.map((q) => (
              <option key={q.key} value={q.key}>
                {q.label}
              </option>
            ))}
          </select>
        </div>

        {quantity?.needsThickness && (
          <Field
            label="Thickness (cm)"
            value={thickness}
            onChange={setThickness}
          />
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Data Source
          </label>

          <div className="flex gap-1">
            {[
              { value: "offline", label: "Offline" },
              { value: "xcom", label: "NIST XCOM" },
            ].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() =>
                  setDataSource(opt.value)
                }
                className={`text-xs px-2.5 py-2 rounded-lg border ${
                  dataSource === opt.value
                    ? "border-beam bg-beam/10 text-ink"
                    : "border-ink/15 text-ink/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full sm:w-auto"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <Layers size={18} />
        )}
        {loading ? "Comparing…" : "Compare Materials"}
      </button>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}

      {chart && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-beam/10 border border-beam/20 p-4"
        >
          <Line
            data={chart}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  labels: {
                    color: "#0B1F3A",
                    font: { family: "Inter" },
                  },
                },
              },
              scales: {
                x: {
                  title: {
                    display: true,
                    text: "Energy (MeV)",
                    color: "#64748b",
                  },
                  ticks: { color: "#64748b" },
                  grid: { color: "#e2e8f0" },
                },
                y: {
                  title: {
                    display: true,
                    text: `${quantity.label}${
                      quantity.unit
                        ? ` (${quantity.unit})`
                        : ""
                    }`,
                    color: "#64748b",
                  },
                  ticks: { color: "#64748b" },
                  grid: { color: "#e2e8f0" },
                },
              },
            }}
          />
        </motion.div>
      )}
    </form>
  );
}

// ====================================================================
// RADIATION SHIELDING CALCULATOR
// ====================================================================

function RadiationShieldingCalculator() {
  const location = useLocation();
  const [formula, setFormula] = useState("");
  const [density, setDensity] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [thickness, setThickness] = useState("");
  const [thicknessUnit, setThicknessUnit] = useState("cm");
  const [energy, setEnergy] = useState("");
  const [energyUnit, setEnergyUnit] = useState("MeV");
  const [compositionMode, setCompositionMode] =
    useState("formula");

  // Rows used for "Weight Fraction" / "Mole Fraction" composition input,
  // e.g. [{ id, element: "Zn", value: "0.8" }, { id, element: "O", value: "0.2" }].
  // Shared between the two modes since only one is active at a time.
  const [compositionRows, setCompositionRows] = useState([
    { id: 1, element: "", value: "" },
    { id: 2, element: "", value: "" },
  ]);
  const nextRowId = useRef(3);

  const addCompositionRow = () => {
    setCompositionRows((rows) => [
      ...rows,
      { id: nextRowId.current++, element: "", value: "" },
    ]);
  };

  const removeCompositionRow = (id) => {
    setCompositionRows((rows) =>
      rows.length > 1 ? rows.filter((row) => row.id !== id) : rows
    );
  };

  const updateCompositionRow = (id, field, value) => {
    setCompositionRows((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const changeCompositionMode = (mode) => {
    setCompositionMode(mode);
    // Reset the row inputs when switching modes so a weight fraction
    // value isn't accidentally reused as a mole fraction (or vice versa).
    setCompositionRows([
      { id: 1, element: "", value: "" },
      { id: 2, element: "", value: "" },
    ]);
  };

  // Build a clean {element: number} map from compositionRows, e.g.
  // { Zn: 0.8, O: 0.2 }. Returns null if any row is incomplete/invalid.
  const buildFractionsMap = () => {
    const map = {};
    for (const row of compositionRows) {
      const element = row.element.trim();
      const numeric = parseFloat(row.value);
      if (!element) continue;
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      const symbol =
        element.charAt(0).toUpperCase() +
        element.slice(1).toLowerCase();
      map[symbol] = (map[symbol] || 0) + numeric;
    }
    return Object.keys(map).length > 0 ? map : null;
  };

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [assistantQuestion, setAssistantQuestion] =
    useState("");
  const [assistantResponse, setAssistantResponse] =
    useState("");
  const [assistantLoading, setAssistantLoading] =
    useState(false);

  // Merged in from the former standalone "Advanced Material Physics"
  // panel: elemental data source + energy-sweep / material-comparison
  // charting, now sharing this calculator's formula/density/thickness.
  const [dataSource, setDataSource] = useState("offline");
  const [compareTop8, setCompareTop8] = useState(false);
  const [library, setLibrary] = useState([]);
  const [sweep, setSweep] = useState(null);
  const [multiSweep, setMultiSweep] = useState(null);
  const [multiSweepMaterials, setMultiSweepMaterials] = useState(null);
  const [sweepError, setSweepError] = useState("");
  const [sweepLoading, setSweepLoading] = useState(false);
  const [savedHistory, setSavedHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nanomed_calculation_history") || "[]"); } catch { return []; }
  });
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    api
      .get("/materials")
      .then((res) => setLibrary(res.data || []))
      .catch(() => setLibrary([]));
  }, []);

  const selectLibraryMaterial = (id) => {
    setSelectedMaterialId(id);
    const material = library.find((m) => m.id === id);
    if (!material) return;
    setFormula(material.formula || "");
    setDensity(material.density != null ? String(material.density) : "");
    setCompositionMode("formula");
    setMessage(null);
  };

  // ------------------------------------------------------------
  // Unit conversions
  // ------------------------------------------------------------

  const convertThicknessToCm = (value, unit) => {
    const numeric = parseFloat(value);

    if (Number.isNaN(numeric)) return NaN;

    switch (unit) {
      case "mm":
        return numeric / 10;

      case "cm":
        return numeric;

      case "m":
        return numeric * 100;

      case "um":
        return numeric / 10000;

      default:
        return numeric;
    }
  };

  const convertEnergyToMeV = (value, unit) => {
    const numeric = parseFloat(value);

    if (Number.isNaN(numeric)) return NaN;

    switch (unit) {
      case "MeV":
        return numeric;

      case "keV":
        return numeric / 1000;

      case "GeV":
        return numeric * 1000;

      default:
        return numeric;
    }
  };

  // ------------------------------------------------------------
  // Formatting
  // ------------------------------------------------------------

  const formatNumber = (value, digits = 6) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      typeof value === "string" &&
        value.toLowerCase() === "not available"
    ) {
      return "Not Available";
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return "Not Available";
    }

    return numeric.toLocaleString(undefined, {
      maximumFractionDigits: digits,
    });
  };

  const getCalculation = () => {
    if (!result) return null;

    // Nanomed endpoint returns the calculation object directly.
    // This also supports a wrapped response if the backend changes later.
    return result.calculation || result;
  };

  const calc = getCalculation();

  // ------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------

  const validate = () => {
    if (compositionMode === "formula") {
      if (!formula.trim()) {
        return "Please enter a chemical formula.";
      }
    } else {
      const fractions = buildFractionsMap();
      if (!fractions) {
        return compositionMode === "weight"
          ? "Enter at least one element with a weight fraction greater than 0."
          : "Enter at least one element with a mole fraction greater than 0.";
      }
    }

    const densityValue = parseFloat(density);

    if (!Number.isFinite(densityValue) || densityValue <= 0) {
      return "Density must be greater than 0.";
    }

    const thicknessValue = parseFloat(thickness);

    if (
      !Number.isFinite(thicknessValue) ||
      thicknessValue < 0
    ) {
      return "Thickness must be 0 or greater.";
    }

    const energyValue = parseFloat(energy);

    if (!Number.isFinite(energyValue) || energyValue <= 0) {
      return "Photon energy must be greater than 0.";
    }

    return "";
  };

  // ------------------------------------------------------------
  // Calculate
  // ------------------------------------------------------------

  const calculateShielding = async (e) => {
    e.preventDefault();

    setMessage(null);
    setResult(null);

    const validationError = validate();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    const thicknessCm = convertThicknessToCm(
      thickness,
      thicknessUnit
    );

    const energyMeV = convertEnergyToMeV(
      energy,
      energyUnit
    );

    if (!Number.isFinite(thicknessCm)) {
      setMessage({
        type: "error",
        text: "Invalid thickness.",
      });

      return;
    }

    if (!Number.isFinite(energyMeV)) {
      setMessage({
        type: "error",
        text: "Invalid photon energy.",
      });

      return;
    }

    setLoading(true);

    try {
      const payload = {
        composition_mode: compositionMode,
        density_g_cm3: parseFloat(density),
        thickness_cm: thicknessCm,
        energy_MeV: energyMeV,
        data_source: dataSource,
      };

      if (compositionMode === "formula") {
        payload.formula = formula.trim();
      } else {
        const fractions = buildFractionsMap();
        if (compositionMode === "weight") {
          payload.weight_fractions = fractions;
        } else {
          payload.mole_fractions = fractions;
        }
      }

      const { data } = await api.post(
        "/calculators/advanced",
        payload
      );

      setResult(data);
      const calculated = data?.calculation || data;
      const historyItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        material: calculated?.formula || formula,
        formula: calculated?.formula || formula,
        energy: calculated?.energy_MeV ?? energyMeV,
        density: calculated?.density_g_cm3 ?? parseFloat(density),
        thickness: calculated?.thickness_cm ?? thicknessCm,
        result: calculated,
        createdAt: new Date().toISOString(),
      };
      setSavedHistory(prev => {
        const next = [historyItem, ...prev].slice(0, 30);
        localStorage.setItem("nanomed_calculation_history", JSON.stringify(next));
        return next;
      });

      setMessage({
        type: "success",
        text: "Shielding calculation completed successfully.",
      });

      setTimeout(() => {
        document
          .getElementById("radiation-results")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not calculate shielding.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Energy sweep / material comparison (merged from the former
  // "Advanced Material Physics" panel)
  // ------------------------------------------------------------

  const runSweep = async () => {
    setSweepError("");
    setSweep(null);
    setMultiSweep(null);
    setMultiSweepMaterials(null);

    if (compositionMode !== "formula") {
      setSweepError(
        "Energy sweep currently requires the Chemical Formula composition mode. Switch modes above, or enter the equivalent formula here."
      );
      return;
    }

    setSweepLoading(true);

    const thicknessCm = convertThicknessToCm(
      thickness,
      thicknessUnit
    );

    try {
      if (compareTop8) {
        if (!density || Number.isNaN(parseFloat(density))) {
          setSweepError("Enter a density for the formula first.");
          setSweepLoading(false);
          return;
        }

        const primary = {
          name: `${formula} (this formula)`,
          formula,
          density: parseFloat(density),
        };

        const others = library
          .filter(
            (m) => m.formula.toLowerCase() !== formula.toLowerCase()
          )
          .slice(0, 7)
          .map((m) => ({
            name: m.name,
            formula: m.formula,
            density: m.density,
          }));

        const materials = [primary, ...others];

        const perMaterial = await Promise.all(
          materials.map((mat) =>
            api
              .post("/calculators/advanced/sweep", {
                formula: mat.formula,
                density_g_cm3: mat.density,
                thickness_cm: Number.isFinite(thicknessCm)
                  ? thicknessCm
                  : 1.0,
                data_source: dataSource,
              })
              .then((res) => ({
                name: mat.name,
                sweep: res.data,
              }))
          )
        );

        const energySet = new Set();

        perMaterial.forEach((m) => {
          m.sweep.results.forEach((r) =>
            energySet.add(r.energy_MeV)
          );
        });

        const energies = Array.from(energySet).sort(
          (a, b) => a - b
        );

        const datasets = perMaterial.map((m, idx) => ({
          label: m.name,
          data: energies.map((energy) => {
            const point = m.sweep.results.find(
              (r) => r.energy_MeV === energy
            );

            return point && point.status === "calculated"
              ? point.calculation.mac_cm2_g
              : null;
          }),
          borderColor:
            SERIES_COLORS[idx % SERIES_COLORS.length],
          backgroundColor:
            SERIES_COLORS[idx % SERIES_COLORS.length],
          tension: 0.25,
        }));

        setMultiSweep({
          labels: energies,
          datasets,
        });

        setMultiSweepMaterials(perMaterial);
      } else {
        const { data } = await api.post(
          "/calculators/advanced/sweep",
          {
            formula,
            density_g_cm3: parseFloat(density),
            thickness_cm: Number.isFinite(thicknessCm)
              ? thicknessCm
              : 1.0,
            data_source: dataSource,
          }
        );

        setSweep(data);
      }
    } catch (err) {
      setSweepError(
        err.response?.data?.detail ||
          "Could not run the energy sweep"
      );
    } finally {
      setSweepLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------

  const resetCalculator = () => {
    setFormula("");
    setDensity("");
    setSelectedMaterialId("");
    setThickness("");
    setThicknessUnit("cm");
    setEnergy("");
    setEnergyUnit("MeV");
    changeCompositionMode("formula");

    setResult(null);
    setMessage(null);

    setAssistantQuestion("");
    setAssistantResponse("");

    setSweep(null);
    setMultiSweep(null);
    setMultiSweepMaterials(null);
    setSweepError("");
  };

  // ------------------------------------------------------------
  // Export JSON
  // ------------------------------------------------------------

  const exportJSON = () => {
    if (!result) return;

    const blob = new Blob(
      [JSON.stringify(result, null, 2)],
      {
        type: "application/json",
      }
    );

    downloadBlob(
      blob,
      `shielding-${formula || "calculation"}.json`
    );
  };

  // ------------------------------------------------------------
  // Export CSV
  // ------------------------------------------------------------

  const exportCSV = () => {
    if (!result || !calc) return;

    const rows = [
      ["Radiation Shielding Calculator"],
      [],
      ["Input", "Value"],
      ["Formula", calc.formula || formula],
      [
        "Energy (MeV)",
        calc.energy_MeV ?? "",
      ],
      [
        "Density (g/cm³)",
        calc.density_g_cm3 ?? density,
      ],
      [
        "Thickness (cm)",
        calc.thickness_cm ?? "",
      ],
      [],
      ["Quantity", "Value"],
      ["MAC (cm²/g)", calc.mac_cm2_g ?? ""],
      ["LAC (cm⁻¹)", calc.lac_cm1 ?? ""],
      ["HVL (cm)", calc.hvl_cm ?? ""],
      ["TVL (cm)", calc.tvl_cm ?? ""],
      ["MFP (cm)", calc.mfp_cm ?? ""],
      ["R", calc.r ?? ""],
      ["Zeff", calc.zeff ?? ""],
      ["Zeq", calc.zeq ?? ""],
      ["Neff (e⁻/g)", calc.neff ?? ""],
      ["Ceff (S/m)", calc.ceff_S_m ?? ""],
      ["ACS (cm²/atom)", calc.acs_cm2_atom ?? ""],
      [
        "ECS (cm²/electron)",
        calc.ecs_cm2_electron ?? "",
      ],
      ["RSE (%)", calc.rse_percent ?? ""],
      ["FNRCS (cm⁻¹)", calc.fnrcs_cm1 ?? ""],
      ["EBF", calc.ebf ?? ""],
      ["EABF", calc.eabf ?? ""],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    downloadBlob(
      blob,
      `shielding-${formula || "calculation"}.csv`
    );
  };

  const printResults = () => {
    window.print();
  };

  // ------------------------------------------------------------
  // AI Assistant
  // ------------------------------------------------------------

  const askAssistant = async () => {
    if (!assistantQuestion.trim()) return;

    setAssistantLoading(true);
    setAssistantResponse("");

    try {
      /*
       * The original Physics-AI project used /ai/ask.
       *
       * We intentionally do not start the Physics-AI backend here.
       * If Nanomed already exposes an AI/chat endpoint, replace this
       * endpoint with that existing Nanomed route.
       */
      const { data } = await api.post("/ai/ask", {
        question: assistantQuestion.trim(),
        material: result?.material || {
          formula,
          density_g_cm3: parseFloat(density),
        },
        calculation: calc,
      });

      setAssistantResponse(
        data.response ||
          data.answer ||
          "No response was returned."
      );
    } catch (err) {
      setAssistantResponse(
        err.response?.data?.detail ||
          "The AI assistant endpoint is not connected to Nanomed yet."
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <section
      id="radiation-shielding-calculator"
      className="glass-panel-light rounded-2xl overflow-hidden"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="p-6 border-b border-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-beam/10 border border-beam/30 flex items-center justify-center">
            <Shield className="text-beam" size={18} />
          </div>

          <h2 className="font-display text-xl font-semibold text-ink">
            Radiation Shielding Calculator
          </h2>
        </div>

        <p className="text-sm text-ink/50 mt-2">
          Calculate photon attenuation, shielding effectiveness,
          effective atomic numbers, cross sections, buildup factors,
          and fast-neutron removal for a chemical material — plus an
          energy-sweep chart across the full grid, or a comparison
          against up to 7 other materials.
        </p>
      </div>

      {/* ======================================================
          INPUT SECTION
      ====================================================== */}

      <form
        onSubmit={calculateShielding}
        className="p-6 space-y-6"
      >
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-beam font-semibold">
            Section 01
          </p>

          <h3 className="font-display text-lg font-semibold text-ink mt-1">
            Material & Conditions
          </h3>

          <p className="text-xs text-ink/50 mt-1">
            Enter the material formula and photon shielding
            conditions.
          </p>
        </div>

        {/* Saved material library */}
        <div className="rounded-2xl border border-beam/20 bg-gradient-to-r from-beam/5 via-white to-signal/5 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Beaker size={16} className="text-beam" />
                <p className="text-sm font-semibold text-ink">Use a saved material</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-beam/10 text-beam font-mono">{library.length} available</span>
              </div>
              <p className="text-[11px] text-ink/45 mt-1">Materials created in your Materials section can be loaded here automatically.</p>
            </div>
            <select
              value={selectedMaterialId}
              onChange={(e) => selectLibraryMaterial(e.target.value)}
              className="w-full lg:w-80 bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
            >
              <option value="">Select saved material…</option>
              {library.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.formula} · {m.density} g/cm³
                </option>
              ))}
            </select>
          </div>
          {selectedMaterialId && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {(() => {
                const m = library.find((x) => x.id === selectedMaterialId);
                return m ? (
                  <>
                    <span className="px-2.5 py-1.5 rounded-lg bg-white border border-ink/10 text-ink/60">Formula <b className="text-ink">{m.formula}</b></span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-white border border-ink/10 text-ink/60">Density <b className="text-ink">{m.density} g/cm³</b></span>
                    {m.particle_size_nm && <span className="px-2.5 py-1.5 rounded-lg bg-white border border-ink/10 text-ink/60">Size <b className="text-ink">{m.particle_size_nm} nm</b></span>}
                  </>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Composition */}

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Composition Input
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => changeCompositionMode("formula")}
              className={`text-left rounded-xl border p-4 transition ${
                compositionMode === "formula"
                  ? "border-beam bg-beam/10"
                  : "border-ink/10 bg-white hover:border-beam/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={compositionMode === "formula"}
                  onChange={() =>
                    changeCompositionMode("formula")
                  }
                />

                <span className="text-sm font-semibold text-ink">
                  Chemical Formula
                </span>
              </div>

              <p className="text-[11px] text-ink/50 mt-1 ml-5">
                Enter a formula such as Bi2O3 or PbWO4.
              </p>
            </button>

            <button
              type="button"
              onClick={() => changeCompositionMode("weight")}
              className={`text-left rounded-xl border p-4 transition ${
                compositionMode === "weight"
                  ? "border-beam bg-beam/10"
                  : "border-ink/10 bg-white hover:border-beam/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={compositionMode === "weight"}
                  onChange={() =>
                    changeCompositionMode("weight")
                  }
                />
                <span className="text-sm font-semibold text-ink">
                  Weight Fraction
                </span>
              </div>

              <p className="text-[11px] text-ink/50 mt-1 ml-5">
                Enter each element's weight fraction (e.g. Zn 0.8, O 0.2).
              </p>
            </button>

            <button
              type="button"
              onClick={() => changeCompositionMode("mole")}
              className={`text-left rounded-xl border p-4 transition ${
                compositionMode === "mole"
                  ? "border-beam bg-beam/10"
                  : "border-ink/10 bg-white hover:border-beam/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={compositionMode === "mole"}
                  onChange={() =>
                    changeCompositionMode("mole")
                  }
                />
                <span className="text-sm font-semibold text-ink">
                  Mole Fraction
                </span>
              </div>

              <p className="text-[11px] text-ink/50 mt-1 ml-5">
                Enter each element's mole fraction (e.g. Zn 0.5, O 0.5).
              </p>
            </button>
          </div>

          {compositionMode === "formula" ? (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
                Material / Chemical Formula
                <span className="text-red-500 ml-1">*</span>
              </label>

              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g. Bi2O3"
                className="w-full bg-white border border-ink/15 rounded-xl px-4 py-3 text-sm text-ink focus:border-beam outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
                  {compositionMode === "weight"
                    ? "Element Weight Fractions"
                    : "Element Mole Fractions"}
                  <span className="text-red-500 ml-1">*</span>
                </label>

                <button
                  type="button"
                  onClick={addCompositionRow}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-black/5 text-ink/70 hover:bg-black/10 flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add element
                </button>
              </div>

              <div className="space-y-2">
                {compositionRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={row.element}
                      onChange={(e) =>
                        updateCompositionRow(
                          row.id,
                          "element",
                          e.target.value
                        )
                      }
                      placeholder="Symbol (e.g. Zn)"
                      className="w-1/2 bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
                    />

                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.value}
                      onChange={(e) =>
                        updateCompositionRow(
                          row.id,
                          "value",
                          e.target.value
                        )
                      }
                      placeholder={
                        compositionMode === "weight"
                          ? "Weight fraction"
                          : "Mole fraction"
                      }
                      className="w-1/2 bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeCompositionRow(row.id)
                      }
                      disabled={compositionRows.length <= 1}
                      className="p-2.5 rounded-xl border border-ink/10 text-ink/40 hover:text-red-500 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-ink/40">
                Values don't need to sum to 1 — they're normalized
                automatically. Element symbols are case-insensitive
                (e.g. "zn" becomes "Zn").
              </p>
            </div>
          )}
        </div>

        {/* Density / Thickness / Energy */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Density (g/cm³)"
            value={density}
            onChange={setDensity}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
              Shield Thickness
            </label>

            <div className="flex">
              <input
                type="number"
                step="any"
                min="0"
                value={thickness}
                onChange={(e) =>
                  setThickness(e.target.value)
                }
                placeholder="1.0"
                className="flex-1 min-w-0 bg-white border border-ink/15 border-r-0 rounded-l-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
              />

              <select
                value={thicknessUnit}
                onChange={(e) =>
                  setThicknessUnit(e.target.value)
                }
                className="w-24 bg-slate-50 border border-ink/15 rounded-r-xl px-2 text-sm text-ink outline-none"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="um">µm</option>
              </select>
            </div>

            <p className="text-[11px] text-ink/40">
              Converted internally to centimetres.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
              Photon Energy
            </label>

            <div className="flex">
              <input
                type="number"
                step="any"
                min="0"
                value={energy}
                onChange={(e) =>
                  setEnergy(e.target.value)
                }
                placeholder="0.662"
                className="flex-1 min-w-0 bg-white border border-ink/15 border-r-0 rounded-l-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
              />

              <select
                value={energyUnit}
                onChange={(e) =>
                  setEnergyUnit(e.target.value)
                }
                className="w-24 bg-slate-50 border border-ink/15 rounded-r-xl px-2 text-sm text-ink outline-none"
              >
                <option value="MeV">MeV</option>
                <option value="keV">keV</option>
                <option value="GeV">GeV</option>
              </select>
            </div>

            <p className="text-[11px] text-ink/40">
              Converted internally to MeV.
            </p>
          </div>
        </div>

        {/* Data Source (merged from Advanced Material Physics) */}

        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
            Elemental Data Source
          </label>

          <div className="flex gap-2">
            {[
              {
                value: "offline",
                label: "Offline (built-in, no internet)",
              },
              {
                value: "xcom",
                label: "Live NIST XCOM",
              },
            ].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setDataSource(opt.value)}
                className={`text-xs px-3 py-2 rounded-xl border transition ${
                  dataSource === opt.value
                    ? "border-beam bg-beam/10 text-ink"
                    : "border-ink/15 text-ink/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Information */}

        <div className="rounded-xl bg-olive-500/5 border border-olive-400/20 p-4 flex gap-3">
          <Info
            size={18}
            className="text-olive-500 flex-shrink-0 mt-0.5"
          />

          <div>
            <p className="text-sm font-semibold text-olive-700">
              Energy and buildup-factor information
            </p>

            <p className="text-xs text-ink/60 mt-1 leading-relaxed">
              Photon attenuation data are evaluated using the
              configured shielding physics engine. The G-P buildup
              factors EBF/EABF are only available within their
              supported energy and penetration conditions.
            </p>
          </div>
        </div>

        {/* Buttons */}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={resetCalculator}
            className="px-4 py-2.5 rounded-xl border border-ink/15 text-sm text-ink/60 hover:bg-black/5 flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <Loader2
                className="animate-spin"
                size={18}
              />
            ) : (
              <Shield size={18} />
            )}

            {loading ? "Calculating…" : "Calculate Shielding"}
          </button>
        </div>

        {/* Message */}

        {message && (
          <div
            className={`rounded-xl p-4 text-sm flex items-start gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700"
                : "bg-red-500/10 border border-red-500/20 text-red-600"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ======================================================
            SECTION 02: ENERGY SWEEP (merged from the former
            "Advanced Material Physics" panel)
        ====================================================== */}

        <div className="border-t border-ink/10 pt-6 space-y-5">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-beam font-semibold">
              Section 02
            </p>

            <h3 className="font-display text-lg font-semibold text-ink mt-1">
              Energy Sweep
            </h3>

            <p className="text-xs text-ink/50 mt-1">
              Plot MAC and attenuation across the full energy grid for
              the formula above, or compare it against up to 7 other
              materials from the library.
            </p>

            {compositionMode !== "formula" && (
              <p className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2 mt-2">
                Energy sweep needs a typed chemical formula. Switch back to
                "Chemical Formula" mode above to use it.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
              Chart Mode
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCompareTop8(false)}
                className={`text-xs px-3 py-2 rounded-xl border transition ${
                  !compareTop8
                    ? "border-beam bg-beam/10 text-ink"
                    : "border-ink/15 text-ink/50"
                }`}
              >
                This formula only
              </button>

              <button
                type="button"
                onClick={() => setCompareTop8(true)}
                className={`text-xs px-3 py-2 rounded-xl border transition ${
                  compareTop8
                    ? "border-beam bg-beam/10 text-ink"
                    : "border-ink/15 text-ink/50"
                }`}
              >
                Compare 8 materials (MAC)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={runSweep}
            disabled={sweepLoading}
            className="btn-primary"
          >
            {sweepLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LineChart size={18} />
            )}

            {compareTop8
              ? "Plot MAC vs Energy — 8 Materials"
              : "Plot MAC & Attenuation vs Energy"}
          </button>

          {sweepError && (
            <p className="text-sm text-red-500">{sweepError}</p>
          )}

          {sweep && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-beam/10 border border-beam/20 p-4"
            >
              <p className="text-xs text-ink/50 mb-3">
                {sweep.formula} · {sweep.calculated_count}/
                {sweep.energy_count} energies calculated ·{" "}
                {sweep.data_source} data source
              </p>

              <AdvancedSweepChart
                sweep={sweep}
                thicknessCm={convertThicknessToCm(
                  thickness,
                  thicknessUnit
                )}
              />
            </motion.div>
          )}

          {sweep && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-ink/10 bg-white/60 p-4"
            >
              <EnergyTrendAnalysis sweep={sweep} />
            </motion.div>
          )}

          {multiSweep && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-beam/10 border border-beam/20 p-4"
            >
              <p className="text-xs text-ink/50 mb-3">
                MAC vs Energy · {multiSweep.datasets.length} materials
                · {dataSource} data source
              </p>

              <Line
                data={multiSweep}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      labels: {
                        color: "#0B1F3A",
                        font: { family: "Inter" },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: "Energy (MeV)",
                        color: "#64748b",
                      },
                      ticks: { color: "#64748b" },
                      grid: { color: "#e2e8f0" },
                    },
                    y: {
                      title: {
                        display: true,
                        text: "MAC (cm²/g)",
                        color: "#64748b",
                      },
                      ticks: { color: "#64748b" },
                      grid: { color: "#e2e8f0" },
                    },
                  },
                }}
              />
            </motion.div>
          )}

          {multiSweepMaterials && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-ink/10 bg-white/60 p-4"
            >
              <MultiEnergyTrendAnalysis materials={multiSweepMaterials} />
            </motion.div>
          )}
        </div>
      </form>

      {/* ======================================================
          RESULTS
      ====================================================== */}

      {result && calc && (
        <div
          id="radiation-results"
          className="p-6 pt-0 space-y-6"
        >
          <div className="border-t border-ink/10 pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-beam font-semibold">
                  Section 02
                </p>

                <h3 className="font-display text-lg font-semibold text-ink mt-1">
                  Calculation Results
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="px-3 py-2 rounded-xl bg-black/5 text-xs text-ink/70 hover:bg-black/10 flex items-center gap-1.5"
                >
                  <Download size={14} />
                  CSV
                </button>

                <button
                  type="button"
                  onClick={exportJSON}
                  className="px-3 py-2 rounded-xl bg-black/5 text-xs text-ink/70 hover:bg-black/10 flex items-center gap-1.5"
                >
                  <FileJson size={14} />
                  JSON
                </button>

                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="px-3 py-2 rounded-xl bg-beam/10 text-xs text-beam hover:bg-beam/20 flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  Report preview
                </button>
                <button
                  type="button"
                  onClick={printResults}
                  className="px-3 py-2 rounded-xl bg-black/5 text-xs text-ink/70 hover:bg-black/10 flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Print / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Input Summary */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryBox
              label="Material"
              value={calc.formula || formula}
            />

            <SummaryBox
              label="Energy"
              value={`${formatNumber(
                calc.energy_MeV
              )} MeV`}
            />

            <SummaryBox
              label="Density"
              value={`${formatNumber(
                calc.density_g_cm3
              )} g/cm³`}
            />

            <SummaryBox
              label="Thickness"
              value={`${formatNumber(
                calc.thickness_cm
              )} cm`}
            />
          </div>

          {/* Main result cards */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard
              label="MAC"
              value={calc.mac_cm2_g}
              unit="cm²/g"
            />

            <ResultCard
              label="LAC"
              value={calc.lac_cm1}
              unit="cm⁻¹"
            />

            <ResultCard
              label="HVL"
              value={calc.hvl_cm}
              unit="cm"
            />

            <ResultCard
              label="TVL"
              value={calc.tvl_cm}
              unit="cm"
            />

            <ResultCard
              label="MFP"
              value={calc.mfp_cm}
              unit="cm"
            />

            <ResultCard
              label="R"
              value={calc.r}
            />

            <ResultCard
              label="Zeff"
              value={calc.zeff}
            />

            <ResultCard
              label="Zeq"
              value={calc.zeq}
            />

            <ResultCard
              label="Neff"
              value={calc.neff}
              unit="e⁻/g"
            />

            <ResultCard
              label="Ceff"
              value={calc.ceff_S_m}
              unit="S/m"
            />

            <ResultCard
              label="ACS"
              value={calc.acs_cm2_atom}
              unit="cm²/atom"
            />

            <ResultCard
              label="ECS"
              value={calc.ecs_cm2_electron}
              unit="cm²/electron"
            />

            <ResultCard
              label="RSE"
              value={calc.rse_percent}
              unit="%"
            />

            <ResultCard
              label="FNRCS"
              value={calc.fnrcs_cm1}
              unit="cm⁻¹"
            />

            <ResultCard
              label="EBF"
              value={calc.ebf}
              unavailable={
                calc.ebf === null ||
                calc.ebf === undefined
              }
            />

            <ResultCard
              label="EABF"
              value={calc.eabf}
              unavailable={
                calc.eabf === null ||
                calc.eabf === undefined
              }
            />
          </div>

          {/* Elemental Data */}

          <ElementalCompositionCard
            calc={calc}
          />

          {/* Availability */}

          <AvailabilityCard calc={calc} />

          {/* Warnings */}

          <WarningsCard calc={calc} />

          {/* Sources */}

          <SourcesCard calc={calc} />
        </div>
      )}

      {reportOpen && calc && (
        <ReportPreview calc={calc} formula={formula} onClose={() => setReportOpen(false)} onPrint={printResults} />
      )}

      {/* ======================================================
          AI ASSISTANT
      ====================================================== */}

      <div className="p-6">
        <div className="rounded-2xl border border-ink/10 bg-white/60 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-beam/10 text-beam flex items-center justify-center">
              <Bot size={20} />
            </div>

            <div>
              <h3 className="font-display font-semibold text-ink">
                Physics-AI Assistant
              </h3>

              <p className="text-xs text-ink/50">
                Ask questions about the calculated shielding
                results.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 mt-5">
            <input
              type="text"
              value={assistantQuestion}
              onChange={(e) =>
                setAssistantQuestion(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  askAssistant();
                }
              }}
              placeholder="e.g. Why is the HVL important?"
              className="flex-1 bg-white border border-ink/15 rounded-xl px-4 py-3 text-sm text-ink focus:border-beam outline-none"
            />

            <button
              type="button"
              onClick={askAssistant}
              disabled={
                assistantLoading ||
                !assistantQuestion.trim()
              }
              className="btn-primary"
            >
              {assistantLoading ? (
                <Loader2
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Bot size={17} />
              )}

              Ask AI
            </button>
          </div>

          {assistantResponse && (
            <div className="mt-4 rounded-xl bg-black/[0.025] border border-ink/10 p-4 text-sm text-ink/70 whitespace-pre-wrap leading-relaxed">
              {assistantResponse}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ====================================================================
// Radiation Result Components
// ====================================================================

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white/70 p-3">
      <p className="text-[10px] uppercase tracking-wide font-mono text-ink/40">
        {label}
      </p>

      <p className="text-sm font-semibold text-ink mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  unavailable = false,
}) {
  const displayValue = unavailable
    ? "Not Available"
    : formatValue(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 min-h-[120px] flex flex-col justify-center transition ${
        unavailable
          ? "border-dashed border-ink/15 bg-black/[0.015]"
          : "border-ink/10 bg-white/70 hover:border-beam/30 hover:bg-white"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide font-mono text-ink/40">
        {label}
      </p>

      <p
        className={`text-xl font-mono font-semibold mt-2 break-words ${
          unavailable ? "text-ink/40" : "text-ink"
        }`}
      >
        {displayValue}
      </p>

      {unit && !unavailable && (
        <p className="text-[10px] text-ink/40 mt-1">
          {unit}
        </p>
      )}
    </motion.div>
  );
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not Available";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "Not Available";
  }

  if (Math.abs(numeric) >= 100000 || Math.abs(numeric) < 0.000001) {
    return numeric.toExponential(5);
  }

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

// ====================================================================
// Elemental Composition
// ====================================================================


function formatNumber(value, digits = 6) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "not available") {
      return "Not Available";
    }

    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed.toFixed(digits);
    }

    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "—";
    }

    return value.toFixed(digits);
  }

  return String(value);
}

function ElementalCompositionCard({ calc }) {
  const massFractions = calc.mass_fractions || {};
  const stoichiometry = calc.stoichiometry || {};
  const elementalMac = calc.elemental_mac_cm2_g || {};
  const elementalFnrcs = calc.elemental_fnrcs_cm1 || {};
  // Returned directly by the backend as of the weight/mole-fraction update;
  // fall back gracefully if talking to an older API response.
  const atomicNumbers = calc.atomic_numbers || {};
  const atomicWeights = calc.atomic_weights || {};
  const moleFractions = calc.mole_fractions || null;

  const elementNames = Array.from(
    new Set([
      ...Object.keys(massFractions),
      ...Object.keys(stoichiometry),
      ...Object.keys(elementalMac),
      ...Object.keys(elementalFnrcs),
    ])
  );

  const totalStoich = Object.values(
    stoichiometry
  ).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-ink">
            Elemental Composition & Source Data
          </h3>

          <p className="text-xs text-ink/50 mt-1">
            Element-level contributions returned by the
            shielding engine.
          </p>
        </div>

        <span className="text-xs text-ink/40">
          {elementNames.length} elements
        </span>
      </div>

      <div className="overflow-x-auto mt-4 rounded-xl border border-ink/10">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-black/[0.025]">
            <tr>
              <th className="text-left p-3 text-ink/50 font-mono">
                Element
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Z
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Atomic Weight
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Stoichiometry
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Mole Fraction
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Mass Fraction
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Elemental MAC
              </th>

              <th className="text-left p-3 text-ink/50 font-mono">
                Elemental FNRCS
              </th>
            </tr>
          </thead>

          <tbody>
            {elementNames.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-ink/40"
                >
                  Elemental data was not returned by the
                  calculation engine.
                </td>
              </tr>
            ) : (
              elementNames.map((element) => {
                const stoich = Number(
                  stoichiometry[element] || 0
                );

                const moleFraction =
                  moleFractions && moleFractions[element] !== undefined
                    ? Number(moleFractions[element])
                    : totalStoich > 0
                    ? stoich / totalStoich
                    : null;

                return (
                  <tr
                    key={element}
                    className="border-t border-ink/10"
                  >
                    <td className="p-3 font-semibold text-ink">
                      {element}
                    </td>

                    <td className="p-3 text-ink/60">
                      {atomicNumbers[element] ?? "—"}
                    </td>

                    <td className="p-3 text-ink/60">
                      {atomicWeights[element] !== undefined
                        ? formatNumber(atomicWeights[element], 4)
                        : "—"}
                    </td>

                    <td className="p-3 text-ink/60">
                      {formatNumber(stoich)}
                    </td>

                    <td className="p-3 text-ink/60">
                      {moleFraction === null
                        ? "—"
                        : formatNumber(
                            moleFraction,
                            6
                          )}
                    </td>

                    <td className="p-3 text-ink/60">
                      {formatNumber(
                        massFractions[element]
                      )}
                    </td>

                    <td className="p-3 text-ink/60">
                      {formatNumber(
                        elementalMac[element]
                      )}
                    </td>

                    <td className="p-3 text-ink/60">
                      {formatNumber(
                        elementalFnrcs[element]
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink/40 mt-3">
        Atomic number and atomic weight are shown as unavailable
        when they are not included in the current Nanomed API
        response.
      </p>
    </div>
  );
}

// ====================================================================
// Availability
// ====================================================================

function AvailabilityCard({ calc }) {
  const checks = [
    {
      name: "MAC",
      value: calc.mac_cm2_g,
    },
    {
      name: "LAC",
      value: calc.lac_cm1,
    },
    {
      name: "HVL",
      value: calc.hvl_cm,
    },
    {
      name: "TVL",
      value: calc.tvl_cm,
    },
    {
      name: "MFP",
      value: calc.mfp_cm,
    },
    {
      name: "Zeff",
      value: calc.zeff,
    },
    {
      name: "Zeq",
      value: calc.zeq,
    },
    {
      name: "Ceff",
      value: calc.ceff_S_m,
      status: calc.ceff_status,
    },
    {
      name: "FNRCS",
      value: calc.fnrcs_cm1,
      status: calc.fnrcs_status,
    },
    {
      name: "EBF",
      value: calc.ebf,
      status: calc.ebf_eabf_status,
    },
    {
      name: "EABF",
      value: calc.eabf,
      status: calc.ebf_eabf_status,
    },
  ];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2
          size={18}
          className="text-emerald-500"
        />

        <h3 className="font-display font-semibold text-ink">
          Calculation Availability
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
        {checks.map((item) => {
          const available =
            item.value !== null &&
            item.value !== undefined &&
            Number.isFinite(Number(item.value));

          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3"
            >
              <span className="text-xs font-semibold text-ink/70">
                {item.name}
              </span>

              <span
                className={`text-[11px] font-semibold ${
                  available
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {available
                  ? "Available"
                  : "Unavailable"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ====================================================================
// Warnings
// ====================================================================

function WarningsCard({ calc }) {
  const warnings = [
    calc.ceff_warning,
    calc.fnrcs_warning,
    calc.ebf_eabf_warning,
  ].filter(Boolean);

  if (warnings.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2
            size={18}
            className="text-emerald-500"
          />

          <h3 className="font-display font-semibold text-ink">
            Warnings & Notes
          </h3>
        </div>

        <p className="text-xs text-ink/50 mt-2">
          No calculation warnings were returned by the physics
          engine.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-50/50 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle
          size={18}
          className="text-amber-600"
        />

        <h3 className="font-display font-semibold text-ink">
          Warnings & Notes
        </h3>
      </div>

      <div className="space-y-2 mt-4">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className="rounded-xl border border-amber-300/40 bg-amber-100/40 p-3 text-xs text-amber-900 leading-relaxed"
          >
            {warning}
          </div>
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// Sources
// ====================================================================

function SourcesCard({ calc }) {
  const sourceItems = [
    {
      title: "Mass attenuation data",
      text:
        calc.data_source ||
        "Nanomed offline shielding physics engine.",
    },
    {
      title: "Photon interaction calculations",
      text:
        "MAC, LAC, HVL, TVL, MFP and effective-number calculations are produced by the Nanomed advanced physics service.",
    },
    {
      title: "Buildup factors",
      text:
        "EBF/EABF values are returned only when the configured G-P model conditions are satisfied.",
    },
  ];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
      <h3 className="font-display font-semibold text-ink">
        Calculation Data & Sources
      </h3>

      <div className="space-y-2 mt-4">
        {sourceItems.map((source) => (
          <div
            key={source.title}
            className="rounded-xl border border-ink/10 bg-black/[0.02] p-3"
          >
            <p className="text-xs font-semibold text-ink">
              {source.title}
            </p>

            <p className="text-[11px] text-ink/50 mt-1 leading-relaxed">
              {source.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// Utility
// ====================================================================

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ====================================================================
// Generic Field
// ====================================================================

function Field({
  label,
  value,
  onChange,
  step = "any",
  type = "number",
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wide text-ink/50">
        {label}
      </label>

      <input
        type={type}
        step={type === "number" ? step : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink transition focus:border-beam focus:ring-2 focus:ring-beam/15 outline-none"
      />
    </div>
  );
}