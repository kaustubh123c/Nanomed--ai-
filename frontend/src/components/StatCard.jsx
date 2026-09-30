import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, accent = "signal" }) {
  const accentClasses = {
    signal: "text-signal bg-signal/10 border-signal/30",
    beam: "text-beam bg-beam/10 border-beam/30",
    ink: "text-ink bg-ink/10 border-ink/20",
  };

  return (
    <motion.div
      className="glass-panel-light p-5 flex items-center gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${accentClasses[accent]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold text-ink">{value}</p>
        <p className="text-sm text-ink/50">{label}</p>
      </div>
    </motion.div>
  );
}
