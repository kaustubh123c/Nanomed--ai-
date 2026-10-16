import { motion } from "framer-motion";

// Signature visual: a gamma beam crossing a nanomaterial slab, plus the
// energy-response curve produced by the multi-energy sweep. Pure SVG so it
// scales cleanly at any width (the old version used fixed pixel offsets).
export default function GammaBeamHero() {
  const photons = [0, 1, 2, 3, 4, 5];
  const curve = "M0 8 C 18 10, 30 34, 52 44 S 92 58, 120 62 S 170 66, 200 67";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-gradient-to-br from-[#12303F]/90 to-[#0A1F2E]/95 p-5 shadow-[0_30px_80px_rgba(8,10,40,.55)] backdrop-blur">
      <div className="nm-grid-lines pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative flex items-center justify-between text-[10px] font-mono uppercase tracking-[.18em] text-ink/50">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22D3EE]" /> Live attenuation</span>
        <span>Fe₃O₄ · 2 mm</span>
      </div>

      <svg viewBox="0 0 480 150" className="relative mt-3 w-full" role="img" aria-label="Gamma beam attenuating through a nanomaterial slab">
        <defs>
          <linearGradient id="beamGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#22D3EE" stopOpacity=".95" />
            <stop offset="1" stopColor="#1BA5A8" stopOpacity=".15" />
          </linearGradient>
          <linearGradient id="slabGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1BA5A8" stopOpacity=".85" />
            <stop offset="1" stopColor="#2FB8D4" stopOpacity=".45" />
          </linearGradient>
        </defs>

        {/* source */}
        <circle cx="38" cy="75" r="26" fill="#22D3EE" opacity=".12" />
        <circle cx="38" cy="75" r="15" fill="#22D3EE" opacity=".9" />
        <text x="38" y="124" textAnchor="middle" fontSize="9" fill="#9FB0D8" fontFamily="JetBrains Mono, monospace">SOURCE</text>

        {/* beam */}
        <rect x="56" y="73" width="240" height="4" rx="2" fill="url(#beamGrad)" />
        {photons.map((i) => (
          <motion.circle
            key={i}
            cy="75"
            r="3.2"
            fill="#BFF5FF"
            initial={{ cx: 60, opacity: 0 }}
            animate={{ cx: [60, 296], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "linear" }}
          />
        ))}

        {/* slab */}
        <rect x="296" y="30" width="34" height="90" rx="6" fill="url(#slabGrad)" stroke="#7FD8DC" strokeOpacity=".7" />
        <text x="313" y="80" textAnchor="middle" fontSize="8" fill="#fff" fontFamily="JetBrains Mono, monospace" transform="rotate(90 313 75)">NANOMATERIAL</text>

        {/* thinned beam */}
        <rect x="330" y="74" width="80" height="2" rx="1" fill="#22D3EE" opacity=".35" />
        {[0, 1].map((i) => (
          <motion.circle key={i} cy="75" r="2.4" fill="#22D3EE" initial={{ cx: 332, opacity: 0 }}
            animate={{ cx: [332, 410], opacity: [0, .7, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: "linear" }} />
        ))}

        {/* detector */}
        <rect x="410" y="48" width="54" height="54" rx="12" fill="#ffffff" fillOpacity=".06" stroke="#ffffff" strokeOpacity=".25" />
        <text x="437" y="80" textAnchor="middle" fontSize="14" fill="#4ADEB5" fontFamily="JetBrains Mono, monospace" fontWeight="600">62%</text>
        <text x="437" y="124" textAnchor="middle" fontSize="9" fill="#9FB0D8" fontFamily="JetBrains Mono, monospace">DETECTOR</text>
      </svg>

      <div className="relative mt-1 grid grid-cols-[1fr_auto] items-end gap-4 rounded-2xl border border-ink/10 bg-white p-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[.16em] text-ink/50">Energy sweep · μ vs E</p>
          <svg viewBox="0 0 200 72" className="mt-2 h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d={curve} fill="none" stroke="#22D3EE" strokeWidth="2.2" strokeLinecap="round" />
            {[[0, 8], [52, 44], [120, 62], [200, 67]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#7FD8DC" />)}
          </svg>
        </div>
        <div className="text-right text-[11px] font-mono text-ink/60">
          <p>I₀ 10,000 cps</p>
          <p className="text-[#4ADEB5]">I 3,800 cps</p>
        </div>
      </div>
    </div>
  );
}
