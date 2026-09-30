import { Link } from "react-router-dom";
import { Atom } from "lucide-react";

export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink text-white font-body flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-grid-fade relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #00C2FF 1px, transparent 1px), linear-gradient(to bottom, #00C2FF 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <Link to="/" className="relative flex items-center gap-2 z-10">
          <Atom className="text-beam" size={22} />
          <span className="font-display font-semibold text-lg">NanoMed AI</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="label-eyebrow mb-4">Research infrastructure</p>
          <h2 className="font-display text-3xl font-semibold leading-snug mb-4">
            Every experiment, prediction, and paper in one auditable lab record.
          </h2>
          <p className="text-white/60">
            NanoMed AI keeps your gamma-ray interaction studies, AI recommendations,
            and reports in a single platform your whole research group can trust.
          </p>
        </div>
        <p className="relative z-10 text-white/30 text-sm">
          © {new Date().getFullYear()} NanoMed AI
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Atom className="text-beam" size={22} />
            <span className="font-display font-semibold text-lg">NanoMed AI</span>
          </div>
          <p className="label-eyebrow mb-2">{eyebrow}</p>
          <h1 className="font-display text-2xl font-semibold mb-2">{title}</h1>
          {subtitle && <p className="text-white/60 mb-8 text-sm">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-white/60">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
