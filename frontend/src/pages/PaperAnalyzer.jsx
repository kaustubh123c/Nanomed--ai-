import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, UploadCloud, Loader2, Trash2, Sparkles } from "lucide-react";
import api from "../lib/api";

export default function PaperAnalyzer() {
  const [papers, setPapers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/papers");
    setPapers(data.reverse());
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/papers/upload", formData);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Could not process this PDF");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/papers/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <FileSearch className="text-beam" size={24} />
          Research Paper Analyzer
        </h1>
        <p className="text-ink/50 text-sm mt-1">Upload a PDF to extract structured fields and generate an AI summary.</p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className="glass-panel-light rounded-2xl border-2 border-dashed border-beam/30 p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-beam/60 transition"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {uploading ? <Loader2 className="animate-spin text-beam" size={28} /> : <UploadCloud className="text-beam" size={28} />}
        <p className="text-sm text-ink/60">{uploading ? "Extracting fields…" : "Drop a PDF here, or click to browse"}</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="space-y-4">
        {papers.map((p) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-light p-6 rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-semibold text-ink">{p.title || p.filename}</p>
                {p.authors && <p className="text-xs text-ink/50 mt-0.5">{p.authors.join(", ")}</p>}
              </div>
              <button onClick={() => remove(p.id)} className="text-ink/30 hover:text-red-500 transition shrink-0">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
              <Info label="Materials" value={p.materials_mentioned?.join(", ")} />
              <Info label="Particle Size" value={p.particle_size} />
              <Info label="Energy" value={p.energy} />
              <Info label="Detector" value={p.detector} />
            </div>

            {p.ai_summary && (
              <div className="mt-4 pt-4 border-t border-ink/10">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={14} className="text-beam" />
                  <p className="text-xs font-mono uppercase tracking-wide text-ink/50">AI Summary</p>
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">{p.ai_summary}</p>
              </div>
            )}
          </motion.div>
        ))}
        {papers.length === 0 && <p className="text-ink/40 text-sm">No papers uploaded yet.</p>}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-ink/40">{label}</p>
      <p className="text-ink truncate" title={value}>
        {value || "—"}
      </p>
    </div>
  );
}
