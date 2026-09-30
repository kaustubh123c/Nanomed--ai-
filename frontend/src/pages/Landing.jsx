import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Atom,
  FlaskConical,
  BrainCircuit,
  FileSearch,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Radiation,
} from "lucide-react";
import GammaBeamHero from "../components/GammaBeamHero";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const features = [
  {
    icon: Radiation,
    title: "Beer-Lambert Physics Engine",
    desc: "Linear and mass attenuation, absorption and transmission, computed and stored for every run.",
  },
  {
    icon: BrainCircuit,
    title: "AI Experiment Planner",
    desc: "Random Forest and XGBoost models recommend material, thickness, and expected counts before you touch the bench.",
  },
  {
    icon: FlaskConical,
    title: "Virtual Sim Lab",
    desc: "Watch the beam attenuate through your material in real time, then generate a report from the same run.",
  },
  {
    icon: FileSearch,
    title: "Research Paper Analyzer",
    desc: "Upload a PDF, extract materials, energies, and results, and get an AI-generated summary.",
  },
  {
    icon: BarChart3,
    title: "Analytics That Compare",
    desc: "Material comparisons, prediction accuracy, and detector usage trends across your whole lab.",
  },
  {
    icon: ShieldCheck,
    title: "Built for Research Teams",
    desc: "Role-based access for admins and researchers, with every experiment attributable and auditable.",
  },
];

const steps = [
  { title: "Log your experiment", desc: "Material, source, detector, energy, and raw counts." },
  { title: "Let the engine calculate", desc: "Beer-Lambert attenuation resolved instantly from your inputs." },
  { title: "Ask the AI planner", desc: "Get a recommended material and thickness for your target absorption." },
  { title: "Export a report", desc: "A formatted PDF with charts, calculations, and recommendations." },
];

const testimonials = [
  {
    quote:
      "We replaced three spreadsheets and a shared drive of PDFs with one dashboard our whole group actually uses.",
    name: "Dr. Meera Iyer",
    role: "Radiation Physics Lab, University Research Group",
  },
  {
    quote:
      "The AI planner's thickness recommendation matched our bench result within a few percent on the first try.",
    name: "Dr. Kunal Sen",
    role: "Nanomaterials Research Scientist",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-white font-body overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-ink/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Atom className="text-beam" size={22} />
            <span className="font-display font-semibold text-lg tracking-tight">
              NanoMed AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#research" className="hover:text-white transition">Research</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/80 hover:text-white transition">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">
              Launch Platform
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <p className="label-eyebrow mb-4">Gamma-ray interaction research, digitized</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
            NanoMed AI
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-8 max-w-lg">
            The future of gamma-ray research, powered by artificial intelligence.
            Plan experiments, simulate attenuation, and get nanomaterial
            recommendations for radiation therapy research — in one platform.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/register" className="btn-primary">
              Launch Platform <ArrowRight size={18} />
            </Link>
            <a href="#contact" className="btn-ghost">
              Book Demo
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <GammaBeamHero />
        </motion.div>
      </header>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <motion.p
          className="label-eyebrow mb-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Platform
        </motion.p>
        <motion.h2
          className="font-display text-3xl font-semibold mb-12 max-w-xl"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Everything a radiation-therapy nanomaterials lab needs, in one place
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass-panel p-6"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.05 }}
            >
              <f.icon className="text-signal mb-4" size={26} />
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <p className="label-eyebrow mb-3">Workflow</p>
        <h2 className="font-display text-3xl font-semibold mb-12 max-w-xl">
          From raw counts to a recommended nanomaterial
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              <span className="font-mono text-beam/70 text-sm">{`0${i + 1}`}</span>
              <h3 className="font-display font-semibold mt-2 mb-2">{s.title}</h3>
              <p className="text-white/60 text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* RESEARCH APPLICATIONS / PRODUCTS */}
      <section id="research" className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-10">
          <motion.div
            className="glass-panel p-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <p className="label-eyebrow mb-3">Products</p>
            <h3 className="font-display text-2xl font-semibold mb-4">
              Sim Lab &amp; AI Experiment Planner
            </h3>
            <p className="text-white/60 leading-relaxed">
              Run a virtual experiment, watch the beam attenuate through your
              chosen material in real time, and hand the same parameters to
              the AI planner to get a recommended thickness and expected
              absorption before committing bench time.
            </p>
          </motion.div>
          <motion.div
            className="glass-panel p-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.08 }}
          >
            <p className="label-eyebrow mb-3">Research Applications</p>
            <h3 className="font-display text-2xl font-semibold mb-4">
              Cancer Radiation Therapy Nanomaterials
            </h3>
            <p className="text-white/60 leading-relaxed">
              Built around ferrite and other nanomaterial families used in
              radiation-shielding and dose-modulation research, with a
              research-paper analyzer that turns published studies into
              structured, comparable data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="label-eyebrow mb-3 text-center">What researchers say</p>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              className="glass-panel p-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <p className="text-white/80 italic mb-6">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-semibold">{t.name}</p>
              <p className="text-white/50 text-sm">{t.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-3xl font-semibold mb-4">
          Ready to digitize your lab?
        </h2>
        <p className="text-white/60 mb-8">
          Create a researcher account and log your first experiment in minutes.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="btn-primary">
            Launch Platform <ArrowRight size={18} />
          </Link>
          <a href="mailto:research@nanomed.ai" className="btn-ghost">
            Book Demo
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Atom className="text-beam" size={18} />
            <span className="font-display font-semibold">NanoMed AI</span>
          </div>
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} NanoMed AI Research Platform. Built for research use.
          </p>
        </div>
      </footer>
    </div>
  );
}
