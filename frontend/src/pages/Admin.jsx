import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Trash2, RefreshCw, Users, Database, Cpu } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [retraining, setRetraining] = useState(false);

  const load = async () => {
    const [u, s, a] = await Promise.all([
      api.get("/admin/users"),
      api.get("/admin/stats"),
      api.get("/admin/ai-models"),
    ]);
    setUsers(u.data);
    setStats(s.data);
    setAiStatus(a.data);
  };

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  if (user && user.role !== "admin") {
    return (
      <div className="glass-panel-light p-10 rounded-2xl text-center text-ink/50 text-sm">
        Admin access required.
      </div>
    );
  }

  const removeUser = async (id) => {
    await api.delete(`/admin/users/${id}`);
    load();
  };

  const retrain = async () => {
    setRetraining(true);
    try {
      const { data } = await api.post("/admin/ai-models/retrain");
      setAiStatus(data);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <ShieldCheck className="text-beam" size={24} />
          Admin Panel
        </h1>
        <p className="text-ink/50 text-sm mt-1">Manage users, monitor platform data, and retrain AI models.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="glass-panel-light p-4 rounded-2xl">
              <p className="text-2xl font-display font-semibold text-ink">{v}</p>
              <p className="text-xs text-ink/50 capitalize">{k.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel-light p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-beam" />
            <p className="label-eyebrow text-ink/50">AI Models</p>
          </div>
          <button
            onClick={retrain}
            disabled={retraining}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-beam border border-beam/30 rounded-lg px-3 py-1.5 hover:bg-beam/10 transition"
          >
            <RefreshCw size={14} className={retraining ? "animate-spin" : ""} />
            {retraining ? "Retraining…" : "Retrain on Latest Data"}
          </button>
        </div>
        {aiStatus?.trained ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {Object.entries(aiStatus.metrics || {}).map(([model, m]) => (
              <div key={model} className="bg-ink/[0.03] border border-ink/10 rounded-xl p-3">
                <p className="text-ink/50 capitalize mb-1">{model.replace(/_/g, " ")}</p>
                {typeof m === "object" ? (
                  Object.entries(m).map(([k, v]) => (
                    <p key={k} className="font-mono text-ink">
                      {k}: {typeof v === "number" ? v.toFixed(3) : v}
                    </p>
                  ))
                ) : (
                  <p className="font-mono text-ink">{m}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/40">Models not yet trained — they train automatically on first AI request.</p>
        )}
      </div>

      <div className="glass-panel-light p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-beam" />
          <p className="label-eyebrow text-ink/50">Users</p>
        </div>
        <div className="space-y-2">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-ink/[0.03] border border-ink/10"
            >
              <div>
                <p className="text-sm font-medium text-ink">{u.full_name}</p>
                <p className="text-xs text-ink/50">
                  {u.email} · {u.organization || "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono uppercase text-signal bg-signal/10 border border-signal/30 rounded-full px-2.5 py-1">
                  {u.role}
                </span>
                {u.id !== user?.id && (
                  <button onClick={() => removeUser(u.id)} className="text-ink/30 hover:text-red-500 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
