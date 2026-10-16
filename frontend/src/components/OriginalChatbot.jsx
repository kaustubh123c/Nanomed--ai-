import { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
if (typeof window !== "undefined") window.__NANOMED_API_URL__ = API_BASE;

export default function OriginalChatbot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {open && (
        <div className="fixed inset-2 sm:inset-4 lg:inset-6 overflow-hidden rounded-2xl border border-black/20 bg-white shadow-2xl">
          <button onClick={() => setOpen(false)} aria-label="Close NanoMed chatbot" className="absolute right-3 top-3 z-[5] grid h-10 w-10 place-items-center rounded-full bg-black/70 text-xl text-white shadow-lg hover:bg-black">×</button>
          <iframe title="NamoMed AI Assistant" src="/nanomed-chatbot.html" className="h-full w-full border-0" allow="microphone" />
        </div>
      )}
      <button onClick={() => setOpen(v => !v)} aria-label="Open NamoMed AI Assistant" className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#2dd4bf]/70 bg-[#06111a] text-3xl text-[#2dd4bf] shadow-2xl transition hover:scale-105">✦</button>
    </div>
  );
}
