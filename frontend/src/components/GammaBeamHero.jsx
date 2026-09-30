import { motion } from "framer-motion";

// The one signature element of the design: a live read of the platform's
// actual core mechanic (a gamma beam losing intensity as it crosses a
// nanomaterial slab) rather than a decorative hero graphic.
export default function GammaBeamHero() {
  const photons = [0, 1, 2, 3, 4];

  return (
    <div className="relative w-full h-[280px] md:h-[320px] rounded-2xl border border-white/10 bg-ink2/60 overflow-hidden">
      {/* faint measurement grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #00C2FF 1px, transparent 1px), linear-gradient(to bottom, #00C2FF 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* source */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-beam/20 border border-beam flex items-center justify-center animate-beamPulse">
          <div className="w-6 h-6 rounded-full bg-beam" />
        </div>
        <span className="label-eyebrow">Source</span>
      </div>

      {/* traveling photons, pre-attenuation */}
      <div className="absolute left-24 top-1/2 -translate-y-1/2 w-[340px] h-1 overflow-visible">
        {photons.map((i) => (
          <span
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-beam animate-beamTravel"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </div>

      {/* nanomaterial slab */}
      <div className="absolute left-[380px] top-1/2 -translate-y-1/2 w-16 h-40 rounded-md bg-gradient-to-b from-signal/30 to-signal/10 border border-signal/60 flex items-center justify-center">
        <span className="text-[10px] font-mono text-signal rotate-90 whitespace-nowrap">
          Fe3O4 · 2mm
        </span>
      </div>

      {/* thinned beam after slab */}
      <div className="absolute left-[456px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-beam/40 animate-beamPulse" />

      {/* detector */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <motion.div
          className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        >
          <span className="font-mono text-signal text-xs">62%</span>
        </motion.div>
        <span className="label-eyebrow">Detector</span>
      </div>

      <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[11px] font-mono text-white/50">
        <span>I₀ = 10,000 cps</span>
        <span>μ/ρ resolved live in Sim Lab</span>
        <span>I = 3,800 cps</span>
      </div>
    </div>
  );
}
