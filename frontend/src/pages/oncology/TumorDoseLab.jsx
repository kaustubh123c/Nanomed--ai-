import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Crosshair, Save, Trash2, AlertCircle, ShieldAlert, TrendingUp, Gauge } from "lucide-react";
import api from "../../lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const TEAL = "#0E7C86", RIBBON = "#D6336C", MUTED = "#5C7380", GRID = "#DAE7E9";
const axis = (title) => ({ title: { display: !!title, text: title, color: MUTED }, ticks: { color: MUTED }, grid: { color: GRID } });

export default function TumorDoseLab() {
  const [params] = useSearchParams();
  const [cancers, setCancers] = useState([]);
  const [nps, setNps] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    cancer_id: "", nanoparticle: "Au", concentration_mg_per_g: 7, energy_kev: 100,
    depth_cm: 3, prescription_gy: 50, fractions: 25, alpha_beta: 10,
  });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPlans = useCallback(() => api.get("/oncology/plans").then((r) => setPlans(r.data)).catch(() => {}), []);

  useEffect(() => {
    Promise.all([api.get("/oncology/cancer-types"), api.get("/oncology/nanoparticles")])
      .then(([c, n]) => {
        setCancers(c.data.items); setNps(n.data.items);
        const pre = c.data.items.find((x) => x.id === params.get("cancer"));
        if (pre) applyCancer(pre);
      })
      .catch(() => setErr("Couldn't reach the oncology API. Is the backend running?"));
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCancer = (c) => setForm((f) => ({
    ...f, cancer_id: c.id, prescription_gy: c.typical_dose_gy, fractions: c.typical_fractions,
    alpha_beta: c.alpha_beta, depth_cm: c.depth_cm,
  }));

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "number" || e.target.type === "range" ? Number(e.target.value) : e.target.value });

  const run = useCallback(async (save = false) => {
    setBusy(true); setErr("");
    try {
      const body = { ...form, cancer_id: form.cancer_id || null, save };
      const { data } = await api.post("/oncology/dose-enhancement", body);
      setRes(data);
      if (save) loadPlans();
    } catch (e) {
      const d = e.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Check the input ranges and try again.");
    } finally { setBusy(false); }
  }, [form, loadPlans]);

  // live-update (debounced) as inputs change
  useEffect(() => { const t = setTimeout(() => run(false), 350); return () => clearTimeout(t); }, [run]);

  const removePlan = async (id) => { await api.delete(`/oncology/plans/${id}`); loadPlans(); };
  const cancer = cancers.find((c) => c.id === form.cancer_id);

  const defChart = useMemo(() => res && {
    labels: res.energy_curve.map((p) => p.energy_kev >= 1000 ? `${p.energy_kev / 1000} MeV` : `${p.energy_kev} keV`),
    datasets: [{ label: "Dose enhancement factor", data: res.energy_curve.map((p) => p.def), borderColor: TEAL,
      backgroundColor: "rgba(14,124,134,.12)", fill: true, tension: 0.3, pointRadius: 3 }],
  }, [res]);
  const matChart = useMemo(() => res && {
    labels: res.material_comparison.map((m) => m.symbol),
    datasets: [{ label: "DEF at selected energy", data: res.material_comparison.map((m) => m.def),
      backgroundColor: res.material_comparison.map((m) => m.symbol === form.nanoparticle ? RIBBON : "rgba(14,124,134,.55)"), borderRadius: 6 }],
  }, [res, form.nanoparticle]);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">Oncology</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Tumor Dose Lab</h1>
        <p className="nm-muted mt-1 max-w-2xl">Estimate how much a nanoparticle-loaded tumour absorbs relative to normal tissue, and what that means for biologically effective dose.</p>
      </div>
      {err && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"><AlertCircle size={16} />{err}</div>}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="nm-card space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/60">Cancer type (preset)</label>
            <select value={form.cancer_id} onChange={(e) => { const c = cancers.find((x) => x.id === e.target.value); c ? applyCancer(c) : setForm({ ...form, cancer_id: "" }); }} className="nm-input">
              <option value="">Custom</option>{cancers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/60">Nanoparticle</label>
            <select value={form.nanoparticle} onChange={set("nanoparticle")} className="nm-input">
              {nps.map((n) => <option key={n.symbol} value={n.symbol}>{n.name} - Z={n.z}</option>)}
            </select>
          </div>
          <Range label="Concentration" unit="mg / g tumour" min={0} max={50} step={0.5} value={form.concentration_mg_per_g} onChange={set("concentration_mg_per_g")} />
          <Range label="Photon energy" unit="keV" min={20} max={6000} step={10} value={form.energy_kev} onChange={set("energy_kev")} />
          <Range label="Tumour depth" unit="cm" min={0} max={20} step={0.5} value={form.depth_cm} onChange={set("depth_cm")} />
          <div className="grid grid-cols-2 gap-3">
            <Num label="Prescription (Gy)" value={form.prescription_gy} onChange={set("prescription_gy")} step="0.5" />
            <Num label="Fractions" value={form.fractions} onChange={set("fractions")} />
          </div>
          <Num label="Tumour α/β ratio (Gy)" value={form.alpha_beta} onChange={set("alpha_beta")} step="0.1" />
          <div className="flex gap-2 pt-1">
            <button onClick={() => run(true)} disabled={busy} className="btn-primary flex-1"><Save size={16} /> Save scenario</button>
          </div>
          {cancer && <p className="text-[11px] text-ink/45">Preset: {cancer.name} - {cancer.regimens[0]}</p>}
        </section>

        <div className="space-y-6">
          {res && <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={TrendingUp} label="Dose enhancement" value={`×${res.dose_enhancement_factor.toFixed(2)}`} sub={`+${res.enhancement_percent}% local dose`} hot />
              <Kpi icon={Gauge} label="EQD2 without NP" value={`${res.base.eqd2_gy} Gy`} sub={`${res.base.dose_per_fraction_gy} Gy / fx`} />
              <Kpi icon={Crosshair} label="EQD2 with NP" value={`${res.enhanced.eqd2_gy} Gy`} sub={`BED ${res.enhanced.bed_gy} Gy`} hot />
              <Kpi icon={Gauge} label="Beam at depth" value={`${(res.relative_fluence_at_depth * 100).toFixed(1)}%`} sub={`primary fluence @ ${form.depth_cm} cm`} />
            </section>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="nm-card p-5"><p className="nm-section-title mb-3">Enhancement vs photon energy</p>
                <Line data={defChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: axis("Photon energy"), y: axis("DEF") } }} /></div>
              <div className="nm-card p-5"><p className="nm-section-title mb-3">Material comparison @ {form.energy_kev} keV</p>
                <Bar data={matChart} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: axis(), y: axis("DEF") } }} /></div>
            </section>
            <p className="flex items-start gap-2 rounded-2xl border border-ribbon-100 bg-ribbon-50 p-4 text-xs text-ribbon-600"><ShieldAlert size={15} className="mt-0.5 shrink-0" />{res.disclaimer} Enhancement is a local energy-deposition upper bound that ignores secondary-electron escape; real gains depend on nanoparticle uptake, distribution and beam spectrum.</p>
          </>}

          <section className="nm-card p-5">
            <p className="nm-section-title mb-3">Saved scenarios</p>
            {!plans.length ? <p className="nm-muted">Nothing saved yet. Tune the inputs and press “Save scenario”.</p> : (
              <div className="divide-y divide-ink/5">{plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold text-ink">{p.label}</p>
                    <p className="text-xs text-ink/45">{p.inputs.prescription_gy} Gy / {p.inputs.fractions} fx · {p.inputs.concentration_mg_per_g} mg/g</p></div>
                  <div className="flex items-center gap-3"><span className="nm-ribbon-chip">×{p.dose_enhancement_factor.toFixed(2)}</span>
                    <span className="hidden font-mono text-xs text-sage-700 sm:inline">EQD2 {p.enhanced_eqd2_gy} Gy</span>
                    <button onClick={() => removePlan(p.id)} className="text-ink/30 hover:text-ribbon-500"><Trash2 size={15} /></button></div>
                </div>))}</div>)}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, hot }) {
  return (
    <div className="nm-kpi">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${hot ? "bg-ribbon-50 text-ribbon-500" : "bg-sage-50 text-sage-600"}`}><Icon size={17} /></span>
      <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs font-semibold text-ink/60">{label}</p><p className="text-[11px] text-ink/40">{sub}</p>
    </div>
  );
}
function Range({ label, unit, value, ...rest }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-ink/60">{label}</span><span className="font-mono text-sage-700">{value} {unit}</span></div>
      <input type="range" value={value} {...rest} className="w-full accent-[#0E7C86]" />
    </div>
  );
}
function Num({ label, ...rest }) {
  return <div><label className="mb-1 block text-xs font-semibold text-ink/60">{label}</label><input type="number" {...rest} className="nm-input" /></div>;
}
