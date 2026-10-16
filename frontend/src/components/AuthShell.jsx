import { Link } from "react-router-dom";
import { Atom, Ribbon, Layers3, BrainCircuit, FileBarChart } from "lucide-react";

const points = [
  { icon: Ribbon, text: "Tumor Dose Lab for nanoparticle radiosensitisers" },
  { icon: Layers3, text: "Multi-material, multi-energy shielding sweeps" },
  { icon: BrainCircuit, text: "AI planner for material and thickness" },
];

export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="nm-dark min-h-screen font-body flex">
      <div className="nm-hero-glow relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="nm-grid-lines pointer-events-none absolute inset-0" />
        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <span className="nm-brand-icon grid h-9 w-9 place-items-center rounded-xl border"><Atom size={19} /></span>
          <span className="font-display text-lg font-semibold tracking-tight">NanoMed AI</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="label-eyebrow mb-4">Research infrastructure</p>
          <h2 className="font-display text-4xl font-semibold leading-[1.15] tracking-tight">
            Cancer radiotherapy research, <span className="nm-gradient-text">grounded in physics.</span>
          </h2>
          <p className="mt-4 text-ink/60">
            Tumour-site models, nanoparticle dose enhancement, gamma-ray interaction studies and AI recommendations in one platform for your oncology research group.
          </p>
          <ul className="mt-8 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-ink/75">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-white text-sage-600"><Icon size={16} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-ink/45">© {new Date().getFullYear()} NanoMed AI</p>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-6 sm:p-10 lg:w-[54%]">
        <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-7 shadow-[0_30px_80px_rgba(10,31,46,.12)] sm:p-9">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="nm-brand-icon grid h-9 w-9 place-items-center rounded-xl border"><Atom size={19} /></span>
            <span className="font-display text-lg font-semibold">NanoMed AI</span>
          </Link>
          <p className="label-eyebrow mb-2">{eyebrow}</p>
          <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mb-8 text-sm text-ink/60">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-ink/60">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
