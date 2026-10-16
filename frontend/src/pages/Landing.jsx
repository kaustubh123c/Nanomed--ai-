import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Atom, FlaskConical, BrainCircuit, FileSearch, BarChart3, ShieldCheck,
  ArrowRight, Ribbon, Radiation, Layers3, MessageSquareText, Check,
} from "lucide-react";
import GammaBeamHero from "../components/GammaBeamHero";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-60px" }, variants: fadeUp };

const features = [
  { icon: Ribbon, title: "Cancer radiotherapy module", desc: "Tumour-site library, nanoparticle dose-enhancement factors from NIST data, and BED / EQD2 fractionation maths in one Tumor Dose Lab.", span: "" },
  { icon: Radiation, title: "Beer-Lambert physics engine", desc: "Linear and mass attenuation, absorption and transmission, computed and stored for every run.", span: "" },
  { icon: Layers3, title: "Multi-material · multi-energy sweeps", desc: "Define up to 8 elements by weight fraction and sweep up to 200 energy levels in one run. Get MAC, LAC, HVL, MFP, Zeff and RSE, plus a chart and CSV export.", span: "md:col-span-2", highlight: true },
  { icon: BrainCircuit, title: "AI experiment planner", desc: "Random Forest and XGBoost models recommend material, thickness and expected counts before you touch the bench.", span: "" },
  { icon: FlaskConical, title: "Virtual Sim Lab", desc: "Watch the beam attenuate through your material in real time, then generate a report from the same run.", span: "" },
  { icon: FileSearch, title: "Research paper analyzer", desc: "Upload a PDF, extract materials, energies and results, and get an AI-generated summary.", span: "" },
  { icon: MessageSquareText, title: "NanoMed assistant", desc: "Ask about HVL, MFP or formulas, compare materials, or log an experiment from chat.", span: "" },
  { icon: BarChart3, title: "Analytics that compare", desc: "Material comparisons, prediction accuracy and detector usage trends across your lab.", span: "" },
  { icon: ShieldCheck, title: "Built for research teams", desc: "Role-based access for admins and researchers, with every experiment attributable and auditable.", span: "" },
];

const steps = [
  { title: "Log your experiment", desc: "Material, source, detector, energy and raw counts." },
  { title: "Let the engine calculate", desc: "Attenuation resolved instantly from your inputs, across as many energies as you need." },
  { title: "Ask the AI planner", desc: "Get a recommended material and thickness for your target absorption." },
  { title: "Export a report", desc: "A formatted PDF with charts, calculations and recommendations." },
];

const stats = [
  { v: "8", l: "elements per composition" },
  { v: "200", l: "energy levels per sweep" },
  { v: "R² > 0.99", l: "planner model fit" },
  { v: "2", l: "data sources: offline + NIST XCOM" },
];

export default function Landing() {
  return (
    <div className="nm-dark min-h-screen overflow-x-hidden font-body">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-ink/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="nm-brand-icon grid h-9 w-9 place-items-center rounded-xl border"><Atom size={19} /></span>
            <span className="font-display text-lg font-semibold tracking-tight">NanoMed AI</span>
          </div>
          <div className="hidden items-center gap-8 text-sm text-ink/65 md:flex">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
            <a href="#research" className="transition hover:text-ink">Research</a>
            <a href="#contact" className="transition hover:text-ink">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-ink/80 transition hover:text-ink">Sign in</Link>
            <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">Launch platform</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="nm-hero-glow relative">
        <div className="nm-grid-lines pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 md:grid-cols-[1.05fr_1fr] md:pt-24">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-xs text-ink/75">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]" /> New: Oncology module for cancer radiotherapy research
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Smarter radiotherapy,<br /><span className="nm-gradient-text">starting with the physics.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/65">
              Model nanoparticle dose enhancement for tumour sites, simulate gamma-ray attenuation across
              materials and energies, and plan cancer radiation-therapy research, all in one platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary">Launch platform <ArrowRight size={18} /></Link>
              <a href="#contact" className="btn-ghost">Book demo</a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/55">
              {["Offline physics database", "NIST XCOM lookups", "PDF report export"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check size={14} className="text-[#4ADEB5]" /> {t}</li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <GammaBeamHero />
          </motion.div>
        </div>
      </header>

      {/* STATS */}
      <section className="border-y border-ink/10 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l}>
              <p className="font-display text-3xl font-semibold tracking-tight">{s.v}</p>
              <p className="mt-1 text-xs text-ink/50">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES (bento) */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <motion.p className="label-eyebrow mb-3" {...inView}>Platform</motion.p>
        <motion.h2 className="mb-12 max-w-2xl font-display text-4xl font-semibold tracking-tight" {...inView}>
          Everything a radiation-therapy nanomaterials lab needs, in one place
        </motion.h2>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...inView}
              transition={{ delay: i * 0.04 }}
              className={`group relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-0.5 ${f.span} ${
                f.highlight
                  ? "border-[#9DD3D7] bg-gradient-to-br from-[#E3F5F6] via-white to-[#FDF0F5]"
                  : "border-ink/10 bg-white hover:border-ink/10"
              }`}
            >
              <span className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border ${f.highlight ? "border-[#9DD3D7] bg-white text-sage-600" : "border-ink/10 bg-white text-sage-600"}`}>
                <f.icon size={22} />
              </span>
              <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink/60">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <p className="label-eyebrow mb-3">Workflow</p>
        <h2 className="mb-12 max-w-2xl font-display text-4xl font-semibold tracking-tight">From raw counts to a recommended nanomaterial</h2>
        <div className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...inView} transition={{ delay: i * 0.08 }} className="relative rounded-2xl border border-ink/10 bg-white p-6">
              <span className="font-mono text-sm text-[#22D3EE]">{`0${i + 1}`}</span>
              <h3 className="mb-2 mt-3 font-display font-semibold">{s.title}</h3>
              <p className="text-sm text-ink/60">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* RESEARCH */}
      <section id="research" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div {...inView} className="rounded-3xl border border-ink/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-9">
            <p className="label-eyebrow mb-3">Products</p>
            <h3 className="mb-4 font-display text-2xl font-semibold">Sim Lab &amp; AI Experiment Planner</h3>
            <p className="leading-relaxed text-ink/60">
              Run a virtual experiment, watch the beam attenuate through your material in real time, sweep a composition
              across an energy range, and hand the same parameters to the AI planner to get a recommended thickness and
              expected absorption before committing bench time.
            </p>
          </motion.div>
          <motion.div {...inView} transition={{ delay: 0.08 }} className="rounded-3xl border border-ink/10 bg-gradient-to-br from-white/[.06] to-white/[.02] p-9">
            <p className="label-eyebrow mb-3">Research applications</p>
            <h3 className="mb-4 font-display text-2xl font-semibold">Cancer radiation therapy nanomaterials</h3>
            <p className="leading-relaxed text-ink/60">
              Built around ferrite and other nanomaterial families used in radiation-shielding and dose-modulation
              research, with a paper analyzer that turns published studies into structured, comparable data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="px-6 pb-24 pt-12">
        <div className="nm-hero-glow relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-ink/10 px-8 py-16 text-center">
          <div className="nm-grid-lines pointer-events-none absolute inset-0" />
          <h2 className="relative font-display text-4xl font-semibold tracking-tight">Ready to digitize your lab?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-ink/65">Create a researcher account and log your first experiment in minutes.</p>
          <div className="relative mt-8 flex justify-center gap-4">
            <Link to="/register" className="btn-primary">Launch platform <ArrowRight size={18} /></Link>
            <a href="mailto:research@nanomed.ai" className="btn-ghost">Book demo</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2"><Atom className="text-sage-600" size={18} /><span className="font-display font-semibold">NanoMed AI</span></div>
          <p className="text-sm text-ink/50">© {new Date().getFullYear()} NanoMed AI Research Platform. Built for research use.</p>
        </div>
      </footer>
    </div>
  );
}
