import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart, Download } from "lucide-react";
import api from "../lib/api";

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/reports");
      setReports(data.reverse());
    })();
  }, []);

  const download = async (r) => {
    const res = await api.get(`/reports/${r.id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${r.title}.pdf`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <FileBarChart className="text-beam" size={24} />
          Reports
        </h1>
        <p className="text-ink/50 text-sm mt-1">
          Professional PDF reports generated from Experiments and Sim Lab runs.
        </p>
      </div>

      <div className="space-y-3">
        {reports.length === 0 && (
          <p className="text-ink/40 text-sm">
            No reports yet — generate one from the Experiments or Sim Lab page.
          </p>
        )}
        {reports.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel-light p-5 rounded-2xl flex items-center justify-between"
          >
            <div>
              <p className="font-display font-semibold text-ink">{r.title}</p>
              <p className="text-xs text-ink/50 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <button
              onClick={() => download(r)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-signal border border-signal/30 rounded-lg px-3 py-2 hover:bg-signal/10 transition"
            >
              <Download size={14} /> Download
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
