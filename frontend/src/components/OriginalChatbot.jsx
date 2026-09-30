import { useEffect, useRef, useState } from "react";
import { Bot, Check, FileText, Loader2, MessageCircle, Paperclip, Send, Trash2, X } from "lucide-react";
import api from "../lib/api";

const suggestions = [
  "What is density?",
  "Explain HVL",
  "What is gamma-ray attenuation?",
  "Help me with radiation shielding",
];

function formatText(text = "") {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\r\n/g, "\n")
    .trim();
}

export default function OriginalChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I’m NanoMed AI Assistant. Ask me about radiation, nanomaterials, attenuation, HVL, MFP, simulations, or your uploaded research PDF.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    api.get("/chatbot/status")
      .then(({ data }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });

    api.get("/chatbot/pdf-status")
      .then(({ data }) => {
        if (!cancelled && data.uploaded) setPdf(data.filename);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [open]);

  async function sendMessage(value = input) {
    const question = value.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, {
      id: `${Date.now()}-u`,
      role: "user",
      text: question,
    }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chatbot/chat", { question });
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: formatText(data.answer) || "I received your message but did not get a response.",
      }]);
      setConfigured(true);
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        "I couldn't connect to NanoMed AI. Make sure the backend is running and GEMINI_API_KEY is configured.";
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-e`,
        role: "error",
        text: detail,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function uploadPdf(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-e`,
        role: "error",
        text: "Please select a PDF file.",
      }]);
      return;
    }

    const form = new FormData();
    form.append("file", file);
    setUploading(true);

    try {
      const { data } = await api.post("/chatbot/upload-pdf", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPdf(data.filename);
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-pdf`,
        role: "assistant",
        text: `PDF ready: ${data.filename}. You can now ask questions about it.`,
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-e`,
        role: "error",
        text: error?.response?.data?.detail || "I couldn't process that PDF.",
      }]);
    } finally {
      setUploading(false);
    }
  }

  async function removePdf() {
    try {
      await api.delete("/chatbot/pdf");
      setPdf(null);
      setMessages((prev) => [...prev, {
        id: `${Date.now()}-pdf`,
        role: "assistant",
        text: "The uploaded PDF has been removed.",
      }]);
    } catch {
      // Keep the UI quiet; the next status check will recover the state.
    }
  }

  async function clearChat() {
    try {
      await api.delete("/chatbot/history");
    } catch {}
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: "assistant",
      text: "Chat cleared. How can I help with your NanoMed project?",
    }]);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {open && (
        <section
          aria-label="NanoMed AI Assistant"
          className="mb-3 flex h-[min(680px,calc(100vh-110px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Bot size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">NanoMed AI</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${configured === false ? "bg-amber-500" : "bg-emerald-500"}`} />
                  {configured === false ? "Backend / Gemini setup needed" : "Assistant online"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Clear chat">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close">
                <X size={18} />
              </button>
            </div>
          </header>

          {pdf && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                <FileText size={14} />
                <span className="truncate">{pdf}</span>
              </div>
              <button onClick={removePdf} className="shrink-0 text-[11px] font-medium text-slate-500 hover:text-red-600">
                Remove
              </button>
            </div>
          )}

          <div className="nanomed-chat-scroll flex-1 overflow-y-auto bg-slate-50 px-3 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[86%] rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-sm leading-6 text-white"
                      : message.role === "error"
                        ? "max-w-[90%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700"
                        : "max-w-[90%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-700 shadow-sm"
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{message.text}</div>
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    onClick={() => sendMessage(item)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="mb-3 flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                  <Loader2 size={15} className="animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>Enter to send · Shift+Enter for a new line</span>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium hover:bg-slate-100 hover:text-slate-700">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                PDF
                <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={uploadPdf} className="hidden" disabled={uploading} />
              </label>
            </div>

            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-400">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask NanoMed AI…"
                rows={1}
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close NanoMed AI Assistant" : "Open NanoMed AI Assistant"}
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </div>
  );
}
