import { motion, AnimatePresence } from "framer-motion";
import { Radiation } from "lucide-react";

/**
 * The flagship Sim Lab visual: a gamma source emits pulses that travel
 * across the bench, pass through the material block (visually attenuating
 * in opacity/count proportional to the live `transmissionPercent`), and
 * arrive at the detector. Purely presentational — all physics comes from
 * the backend `/api/simlab/run` response.
 */
export default function BeamLab({ running, transmissionPercent = 100, thicknessCm = 1, materialName = "Material" }) {
  const blockWidth = Math.min(20 + thicknessCm * 40, 140);
  const survivingOpacity = Math.max(transmissionPercent / 100, 0.05);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(0,194,255,0.08),transparent_60%)] p-6 h-[340px] overflow-hidden">
      {/* Bench line */}
      <div className="absolute left-6 right-6 top-1/2 h-px bg-white/10" />

      {/* Gamma source */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-warn/15 border-2 border-warn flex items-center justify-center animate-beamPulse">
          <Radiation className="text-warn" size={26} />
        </div>
        <span className="text-[10px] font-mono uppercase text-white/40">Source</span>
      </div>

      {/* Material block */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-32 rounded-lg border border-beam/40 bg-beam/10 flex items-center justify-center transition-all duration-300"
        style={{ left: 190, width: blockWidth }}
      >
        <span className="text-[10px] font-mono text-beam/80 rotate-90 whitespace-nowrap">{materialName}</span>
      </div>

      {/* Detector */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div
          className="w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: `rgba(16,185,129,${survivingOpacity})`,
            backgroundColor: `rgba(16,185,129,${survivingOpacity * 0.15})`,
          }}
        >
          <span className="font-mono text-xs text-signal">{Math.round(transmissionPercent)}%</span>
        </div>
        <span className="text-[10px] font-mono uppercase text-white/40">Detector</span>
      </div>

      {/* Traveling beam pulses (before material) */}
      <AnimatePresence>
        {running &&
          [0, 0.5, 1].map((delay) => (
            <motion.div
              key={`pre-${delay}`}
              initial={{ left: 60, opacity: 0 }}
              animate={{ left: 190, opacity: [0, 1, 1] }}
              transition={{ duration: 1.1, delay, repeat: Infinity, repeatDelay: 1.4, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-warn shadow-[0_0_10px_2px_rgba(245,158,11,0.6)]"
            />
          ))}
      </AnimatePresence>

      {/* Traveling beam pulses (after material, attenuated) */}
      <AnimatePresence>
        {running &&
          [0.35, 0.85, 1.35].map((delay) => (
            <motion.div
              key={`post-${delay}`}
              initial={{ left: 190 + blockWidth, opacity: 0 }}
              animate={{ left: 560, opacity: [0, survivingOpacity, survivingOpacity] }}
              transition={{ duration: 0.9, delay, repeat: Infinity, repeatDelay: 1.6, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]"
            />
          ))}
      </AnimatePresence>

      <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] font-mono uppercase text-white/30">
        <span>Gamma Source</span>
        <span>Attenuating Material</span>
        <span>Detector Array</span>
      </div>
    </div>
  );
}
