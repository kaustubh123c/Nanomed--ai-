import { useMemo, useState } from "react";
import { Plus, Trash2, Play, RotateCcw, Loader2, Atom, Zap, Layers3, Download } from "lucide-react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import api from "../lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DEFAULT_ELEMENTS = [
  { element: "Au", weight_fraction: "25" },
  { element: "Gd", weight_fraction: "15" },
  { element: "Hf", weight_fraction: "15" },
  { element: "Bi", weight_fraction: "10" },
  { element: "Ag", weight_fraction: "10" },
  { element: "Ti", weight_fraction: "10" },
  { element: "Zn", weight_fraction: "10" },
  { element: "Si", weight_fraction: "5" },
];

const DEFAULT_ENERGIES = ["0.05", "0.1", "0.5", "1", "2", "5", "10"];

function NumberInput({ value, onChange, placeholder, step = "any", min = "0" }) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-beam focus:ring-2 focus:ring-beam/10"
    />
  );
}

export default function SimLab() {
  const [elements, setElements] = useState(DEFAULT_ELEMENTS);
  const [energies, setEnergies] = useState(DEFAULT_ENERGIES);
  const [density, setDensity] = useState("10");
  const [thickness, setThickness] = useState("1");
  const [dataSource, setDataSource] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalFraction = useMemo(
    () => elements.reduce((sum, item) => sum + (Number(item.weight_fraction) || 0), 0),
    [elements]
  );

  const validEnergyCount = useMemo(
    () => energies.filter((energy) => Number(energy) > 0).length,
    [energies]
  );

  const updateElement = (index, key, value) => {
    setElements((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addElement = () => {
    if (elements.length >= 8) return;
    setElements((current) => [...current, { element: "", weight_fraction: "" }]);
  };

  const removeElement = (index) => {
    if (elements.length <= 1) return;
    setElements((current) => current.filter((_, i) => i !== index));
  };

  const addEnergy = () => {
    if (energies.length >= 200) return;
    setEnergies((current) => [...current, ""]);
  };

  const removeEnergy = (index) => {
    if (energies.length <= 1) return;
    setEnergies((current) => current.filter((_, i) => i !== index));
  };

  const reset = () => {
    setElements(DEFAULT_ELEMENTS);
    setEnergies(DEFAULT_ENERGIES);
    setDensity("10");
    setThickness("1");
    setDataSource("");
    setResult(null);
    setError("");
  };

  const runMultiSimulation = async () => {
    setError("");
    setResult(null);
    if (elements.some((item) => !item.element.trim() || Number(item.weight_fraction) <= 0)) {
      setError("Enter a valid element symbol and weight fraction for every material row.");
      return;
    }
    if (Math.abs(totalFraction - 100) > 0.01) {
      setError(`Weight fractions must total 100%. Current total: ${totalFraction.toFixed(2)}%.`);
      return;
    }
    const numericEnergies = energies.map(Number).filter((value) => value > 0);
    if (!numericEnergies.length || numericEnergies.length !== energies.length) {
      setError("Enter a positive energy value for every energy level.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/calculators/advanced/multi-material-sweep", {
        elements: elements.map((item) => ({
          element: item.element.trim(),
          weight_fraction: Number(item.weight_fraction),
        })),
        density_g_cm3: Number(density),
        thickness_cm: Number(thickness),
        energies_MeV: numericEnergies,
        data_source: dataSource || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "The multi-material simulation failed. Check the element symbols and data source.");
    } finally {
      setLoading(false);
    }
  };

  const chart = useMemo(() => {
    if (!result?.results?.length) return null;
    const rows = result.results.filter((row) => row.status === "calculated" && row.lac_cm1 != null);
    if (!rows.length) return null;
    return {
      labels: rows.map((row) => `${row.energy_MeV} MeV`),
      datasets: [
        {
          label: "Linear attenuation coefficient (cm⁻¹)",
          data: rows.map((row) => row.lac_cm1),
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [result]);

  const exportCsv = () => {
    if (!result?.results?.length) return;
    const headers = ["Energy (MeV)", "Status", "MAC (cm²/g)", "LAC (cm⁻¹)", "HVL (cm)", "TVL (cm)", "MFP (cm)", "Zeff", "Zeq", "RSE (%)"];
    const lines = result.results.map((r) => [r.energy_MeV, r.status, r.mac_cm2_g ?? "", r.lac_cm1 ?? "", r.hvl_cm ?? "", r.tvl_cm ?? "", r.mfp_cm ?? "", r.zeff ?? "", r.zeq ?? "", r.rse_percent ?? ""].join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nanomed-multi-material-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="label-eyebrow">Virtual Radiation Laboratory</p>
          <h1 className="font-display text-3xl font-semibold text-ink mt-1">Multi-Material Simulation Lab</h1>
          <p className="text-ink/50 text-sm mt-1">Enter up to 8 elements and run the same material composition across multiple gamma-ray energy levels.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-ink/[0.03]"><RotateCcw size={15}/> Reset</button>
          <button onClick={runMultiSimulation} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-beam px-5 py-2.5 text-sm font-semibold text-ink shadow-sm disabled:opacity-60"><Play size={15} fill="currentColor"/>{loading ? "Running…" : "Run Simulation"}</button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)] gap-5">
        <section className="glass-panel p-5 rounded-2xl space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Atom size={18} className="text-beam"/><div><p className="font-semibold">Material composition</p><p className="text-xs text-ink/45">Maximum 8 elements • weight fractions must total 100%</p></div></div>
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${Math.abs(totalFraction - 100) < 0.01 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>Total: {totalFraction.toFixed(2)}%</div>
          </div>

          <div className="grid grid-cols-[42px_minmax(0,1fr)_170px_42px] gap-2 text-[11px] uppercase tracking-wider text-ink/40 px-1">
            <span>#</span><span>Element symbol</span><span>Weight fraction (%)</span><span />
          </div>
          <div className="space-y-2">
            {elements.map((item, index) => (
              <div key={index} className="grid grid-cols-[42px_minmax(0,1fr)_170px_42px] gap-2 items-center">
                <div className="h-10 rounded-lg bg-ink/[0.04] flex items-center justify-center text-xs font-semibold text-ink/50">{index + 1}</div>
                <input value={item.element} onChange={(e) => updateElement(index, "element", e.target.value)} placeholder="e.g. Au" maxLength={3} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm font-medium uppercase outline-none focus:border-beam" />
                <NumberInput value={item.weight_fraction} onChange={(v) => updateElement(index, "weight_fraction", v)} placeholder="25" min="0.0001" />
                <button onClick={() => removeElement(index)} disabled={elements.length <= 1} className="h-10 rounded-lg border border-ink/10 flex items-center justify-center text-ink/35 hover:text-red-500 disabled:opacity-30"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
          <button onClick={addElement} disabled={elements.length >= 8} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-beam/40 px-3 py-2 text-xs font-semibold text-beam hover:bg-beam/5 disabled:opacity-40"><Plus size={14}/> Add element ({elements.length}/8)</button>

          <div className="border-t border-ink/10 pt-5 grid md:grid-cols-3 gap-3">
            <div><label className="text-xs font-semibold text-ink/55">Material density (g/cm³)</label><div className="mt-1"><NumberInput value={density} onChange={setDensity} min="0.0001"/></div></div>
            <div><label className="text-xs font-semibold text-ink/55">Thickness (cm)</label><div className="mt-1"><NumberInput value={thickness} onChange={setThickness} min="0"/></div></div>
            <div><label className="text-xs font-semibold text-ink/55">Data source</label><select value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-sm outline-none"><option value="">Server default</option><option value="offline">Offline database</option><option value="xcom">NIST XCOM</option></select></div>
          </div>
        </section>

        <section className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Zap size={18} className="text-beam"/><div><p className="font-semibold">Energy levels</p><p className="text-xs text-ink/45">MeV • up to 200 values</p></div></div><span className="text-xs font-semibold text-ink/45">{validEnergyCount} levels</span></div>
          <div className="max-h-[420px] overflow-auto pr-1 space-y-2">
            {energies.map((energy, index) => (
              <div key={index} className="grid grid-cols-[42px_1fr_40px] gap-2 items-center">
                <span className="text-xs text-ink/40 text-center">{index + 1}</span>
                <NumberInput value={energy} onChange={(v) => setEnergies((current) => current.map((item, i) => i === index ? v : item))} placeholder="1.0" min="0.000001"/>
                <button onClick={() => removeEnergy(index)} disabled={energies.length <= 1} className="h-10 rounded-lg border border-ink/10 flex items-center justify-center text-ink/35 hover:text-red-500 disabled:opacity-30"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={addEnergy} disabled={energies.length >= 200} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-beam/40 px-3 py-2 text-xs font-semibold text-beam hover:bg-beam/5 disabled:opacity-40"><Plus size={14}/> Add energy level</button>
          <div className="rounded-xl bg-ink/[0.035] p-3 text-xs text-ink/55 leading-relaxed"><strong className="text-ink/75">Example:</strong> 0.05, 0.1, 0.5, 1, 2, 5 and 10 MeV. You can enter any positive energy supported by the selected data source.</div>
        </section>
      </div>

      {loading && <div className="glass-panel rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-ink/55"><Loader2 size={18} className="animate-spin text-beam"/> Calculating composition and every selected energy level…</div>}

      {result && !loading && (
        <div className="space-y-5">
          <section className="glass-panel rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4"><div><p className="label-eyebrow">Simulation Results</p><h2 className="font-display text-xl font-semibold mt-1">{result.calculated_count} / {result.energy_count} energy levels calculated</h2></div><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-xs font-semibold hover:bg-ink/[0.03]"><Download size={14}/> Export CSV</button></div>
            <div className="flex flex-wrap gap-2 mb-5">{result.elements.map((item) => <span key={item.element} className="rounded-full bg-beam/10 text-beam px-3 py-1.5 text-xs font-semibold">{item.element}: {item.weight_fraction_percent}%</span>)}</div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink/40"><th className="py-3 pr-4">Energy</th><th className="py-3 pr-4">MAC</th><th className="py-3 pr-4">LAC</th><th className="py-3 pr-4">HVL</th><th className="py-3 pr-4">MFP</th><th className="py-3 pr-4">Zeff</th><th className="py-3">Status</th></tr></thead><tbody>{result.results.map((row) => <tr key={row.index} className="border-b border-ink/5"><td className="py-3 pr-4 font-semibold">{row.energy_MeV} MeV</td><td className="py-3 pr-4">{row.mac_cm2_g == null ? "—" : Number(row.mac_cm2_g).toFixed(5)}</td><td className="py-3 pr-4">{row.lac_cm1 == null ? "—" : Number(row.lac_cm1).toFixed(5)}</td><td className="py-3 pr-4">{row.hvl_cm == null ? "—" : Number(row.hvl_cm).toFixed(5)}</td><td className="py-3 pr-4">{row.mfp_cm == null ? "—" : Number(row.mfp_cm).toFixed(5)}</td><td className="py-3 pr-4">{row.zeff == null ? "—" : Number(row.zeff).toFixed(3)}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${row.status === "calculated" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
          </section>

          {chart && <section className="glass-panel rounded-2xl p-5"><div className="flex items-center gap-2 mb-4"><Layers3 size={17} className="text-beam"/><div><p className="font-semibold">Energy response</p><p className="text-xs text-ink/45">Linear attenuation coefficient versus energy</p></div></div><div className="h-[300px]"><Line data={chart} options={{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:true}}, scales:{y:{beginAtZero:true},x:{grid:{display:false}}}}}/></div></section>}
        </div>
      )}
    </div>
  );
}
