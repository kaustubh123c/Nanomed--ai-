import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Plus, Sparkles, FileDown, X } from "lucide-react";
import api from "../lib/api";

const EMPTY_FORM = {
  experiment_name: "",
  material_id: "",
  detector: "",
  gamma_source: "",
  energy_kev: 140,
  initial_counts: 10000,
  thickness_cm: 0.5,
  temperature_c: "",
  pressure_kpa: "",
  notes: "",
};

export default function Experiments() {
  const [experiments, setExperiments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [detectors, setDetectors] = useState([]);
  const [gammaSources, setGammaSources] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [predictionById, setPredictionById] = useState({});

  const load = async () => {
    const [expRes, matRes, refRes] = await Promise.all([
      api.get("/experiments"),
      api.get("/materials"),
      api.get("/materials/reference-data"),
    ]);
    setExperiments(expRes.data.reverse());
    setMaterials(matRes.data);
    setDetectors(refRes.data.detectors);
    setGammaSources(refRes.data.gamma_sources);
    if (!form.material_id) setForm((f) => ({ ...f, material_id: matRes.data[0]?.id, detector: refRes.data.detectors[0], gamma_source: refRes.data.gamma_sources[0]?.name }));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/experiments", {
        ...form,
        energy_kev: parseFloat(form.energy_kev),
        initial_counts: parseFloat(form.initial_counts),
        thickness_cm: parseFloat(form.thickness_cm),
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
        pressure_kpa: form.pressure_kpa ? parseFloat(form.pressure_kpa) : null,
      });
      setForm({ ...EMPTY_FORM, material_id: form.material_id, detector: form.detector, gamma_source: form.gamma_source });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const predict = async (id) => {
    setBusyId(id);
    try {
      const { data } = await api.post(`/experiments/${id}/predict`);
      setPredictionById((p) => ({ ...p, [id]: data }));
    } finally {
      setBusyId(null);
    }
  };

  const generateReport = async (id) => {
    setBusyId(id);
    try {
      const { data } = await api.post("/reports", { experiment_id: id });
      const download = await api.get(`/reports/${data.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([download.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.title}.pdf`;
      link.click();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
            <FlaskConical className="text-beam" size={24} />
            Experiments
          </h1>
          <p className="text-ink/50 text-sm mt-1">Log a run, predict against it, and export a report.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "New Experiment"}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={submit}
          className="glass-panel-light p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Field label="Experiment Name" value={form.experiment_name} onChange={(v) => setForm({ ...form, experiment_name: v })} required />
          <SelectField label="Material" value={form.material_id} onChange={(v) => setForm({ ...form, material_id: v })} options={materials.map((m) => ({ label: m.name, value: m.id }))} />
          <SelectField label="Detector" value={form.detector} onChange={(v) => setForm({ ...form, detector: v })} options={detectors.map((d) => ({ label: d, value: d }))} />
          <SelectField label="Gamma Source" value={form.gamma_source} onChange={(v) => setForm({ ...form, gamma_source: v })} options={gammaSources.map((g) => ({ label: `${g.name} (${g.energy_kev} keV)`, value: g.name }))} />
          <Field label="Energy (keV)" type="number" step="any" value={form.energy_kev} onChange={(v) => setForm({ ...form, energy_kev: v })} required />
          <Field label="Thickness (cm)" type="number" step="any" value={form.thickness_cm} onChange={(v) => setForm({ ...form, thickness_cm: v })} required />
          <Field label="Initial Counts" type="number" step="any" value={form.initial_counts} onChange={(v) => setForm({ ...form, initial_counts: v })} required />
          <Field label="Temperature (°C)" type="number" step="any" value={form.temperature_c} onChange={(v) => setForm({ ...form, temperature_c: v })} />
          <Field label="Pressure (kPa)" type="number" step="any" value={form.pressure_kpa} onChange={(v) => setForm({ ...form, pressure_kpa: v })} />
          <div className="md:col-span-3">
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save Experiment"}
            </button>
          </div>
        </motion.form>
      )}

      <div className="space-y-3">
        {experiments.length === 0 && <p className="text-ink/40 text-sm">No experiments logged yet.</p>}
        {experiments.map((exp) => (
          <motion.div key={exp.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-light p-5 rounded-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-ink">{exp.experiment_name}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {exp.material_name} · {exp.detector} · {exp.gamma_source} · {exp.energy_kev} keV · {exp.thickness_cm} cm
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => predict(exp.id)}
                  disabled={busyId === exp.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-beam border border-beam/30 rounded-lg px-3 py-1.5 hover:bg-beam/10 transition"
                >
                  <Sparkles size={14} /> Predict
                </button>
                <button
                  onClick={() => generateReport(exp.id)}
                  disabled={busyId === exp.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal border border-signal/30 rounded-lg px-3 py-1.5 hover:bg-signal/10 transition"
                >
                  <FileDown size={14} /> Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
              <Info label="Absorption" value={`${exp.absorption_percent?.toFixed(2)}%`} />
              <Info label="Final Counts" value={exp.final_counts?.toFixed(0)} />
              <Info label="μ (1/cm)" value={exp.linear_attenuation_coeff?.toFixed(4)} />
              <Info label="μ/ρ (cm²/g)" value={exp.mass_attenuation_coeff?.toFixed(4)} />
            </div>

            {predictionById[exp.id] && (
              <div className="mt-4 pt-4 border-t border-ink/10 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-ink/40">AI Predicted Absorption</p>
                  <p className="font-mono text-beam text-sm">
                    {predictionById[exp.id].absorption.absorption_percent.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-ink/40">AI Predicted Final Counts</p>
                  <p className="font-mono text-beam text-sm">{predictionById[exp.id].counts.final_counts.toFixed(0)}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea, ...rest }) {
  const Comp = textarea ? "textarea" : "input";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</label>
      <Comp
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={textarea ? 3 : undefined}
        className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
        {...rest}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wide text-ink/50">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-ink/15 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-beam outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-ink/40">{label}</p>
      <p className="font-mono text-ink">{value ?? "—"}</p>
    </div>
  );
}
