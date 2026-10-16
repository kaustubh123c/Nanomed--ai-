import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Ribbon, Search, ArrowRight, X, Crosshair, Syringe, Atom, FlaskConical, BookOpen, ShieldAlert } from "lucide-react";
import api from "../../lib/api";

const MODALITY_FILTERS = ["All", "EBRT", "SBRT", "Brachy", "Proton"];

export default function OncologyHub() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("All");
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/oncology/cancer-types")
      .then((r) => { setItems(r.data.items); setDisclaimer(r.data.disclaimer); })
      .catch(() => setError("Couldn't load cancer sites. Is the backend running?"));
  }, []);

  const shown = useMemo(() => items.filter((c) => {
    const text = `${c.name} ${c.site} ${c.modalities.join(" ")}`.toLowerCase();
    const okQ = text.includes(q.toLowerCase());
    const okM = mod === "All" || text.includes(mod.toLowerCase());
    return okQ && okM;
  }), [items, q, mod]);

  const openInLab = (c) => navigate(`/dashboard/oncology/dose-lab?cancer=${c.id}`);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="nm-onco-hero relative overflow-hidden rounded-[28px] p-6 text-white sm:p-9">
        <div className="relative z-10 max-w-2xl">
          <span className="nm-ribbon-chip"><Ribbon size={13} /> Cancer research department</span>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Nanomaterials for <span className="nm-gradient-text">cancer radiotherapy</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Explore common tumour sites, typical radiotherapy regimens and how high-Z nanoparticles
            (gold, gadolinium, hafnium…) can boost the dose absorbed inside a tumour.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard/oncology/dose-lab" className="btn-primary"><Crosshair size={17} /> Open Tumor Dose Lab <ArrowRight size={15} /></Link>
            <Link to="/dashboard/oncology/radiosensitizers" className="btn-ghost"><BookOpen size={16} /> Radiosensitizer guide</Link>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [Atom, "Physics-based", "NIST mass-energy-absorption data drives every enhancement estimate."],
          [Syringe, "Treatment context", "Typical dose, fractionation and alpha/beta ratio for each tumour site."],
          [FlaskConical, "Research ready", "Save scenarios, compare materials and feed results into reports."],
        ].map(([Icon, t, d]) => (
          <div key={t} className="nm-feature-card flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-50 text-sage-600"><Icon size={18} /></span>
            <div><p className="font-display font-semibold text-ink">{t}</p><p className="mt-0.5 text-xs leading-relaxed text-ink/55">{d}</p></div>
          </div>
        ))}
      </section>

      <section className="nm-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="label-eyebrow">Tumour sites</p><h2 className="nm-section-title mt-1">Cancer types &amp; typical radiotherapy</h2></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative"><Search size={15} className="absolute left-3 top-3 text-ink/35" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cancer or modality…" className="nm-input pl-9 sm:w-64" /></div>
            <div className="flex flex-wrap gap-1.5">{MODALITY_FILTERS.map((m) => (
              <button key={m} onClick={() => setMod(m)} className={`nm-tab ${mod === m ? "is-active" : ""}`}>{m}</button>))}</div>
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <button key={c.id} onClick={() => setActive(c)} className="nm-feature-card text-left">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-display text-base font-semibold text-ink">{c.name}</p><p className="text-xs text-ink/45">{c.site}</p></div>
                <span className="nm-ribbon-chip">α/β {c.alpha_beta}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink/60">{c.summary}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-mono text-sage-700">{c.typical_dose_gy} Gy / {c.typical_fractions} fx</span>
                <span className="inline-flex items-center gap-1 font-semibold text-sage-600">Details <ArrowRight size={13} /></span>
              </div>
            </button>
          ))}
          {!shown.length && !error && <p className="col-span-full py-8 text-center text-sm text-ink/45">No matching cancer sites.</p>}
        </div>
      </section>

      {disclaimer && <p className="flex items-start gap-2 rounded-2xl border border-ribbon-100 bg-ribbon-50 p-4 text-xs text-ribbon-600"><ShieldAlert size={15} className="mt-0.5 shrink-0" />{disclaimer}</p>}

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex justify-end bg-ink/40 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setActive(null)}>
            <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div><span className="nm-ribbon-chip">{active.site}</span><h3 className="mt-2 font-display text-2xl font-semibold text-ink">{active.name}</h3></div>
                <button onClick={() => setActive(null)} className="rounded-xl border border-ink/10 p-2 text-ink/50 hover:text-ink"><X size={16} /></button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{active.summary}</p>
              <Block title="Typical regimens" items={active.regimens} />
              <Block title="Treatment modalities" items={active.modalities} chips />
              <Block title="Nanoparticle strategies" items={active.np_strategies} />
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[["Dose", `${active.typical_dose_gy} Gy`], ["Fractions", active.typical_fractions], ["Depth", `${active.depth_cm} cm`]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-sage-50 p-3"><p className="font-display text-lg font-semibold text-sage-700">{v}</p><p className="text-[10px] uppercase tracking-wide text-ink/45">{l}</p></div>))}
              </div>
              <button onClick={() => openInLab(active)} className="btn-primary mt-6 w-full"><Crosshair size={17} /> Model in Tumor Dose Lab</button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({ title, items, chips }) {
  return (
    <div className="mt-5">
      <p className="label-eyebrow mb-2">{title}</p>
      {chips ? <div className="flex flex-wrap gap-1.5">{items.map((i) => <span key={i} className="nm-chip">{i}</span>)}</div>
        : <ul className="space-y-1.5">{items.map((i) => <li key={i} className="flex gap-2 text-sm text-ink/70"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-500" />{i}</li>)}</ul>}
    </div>
  );
}
