import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowRight, Atom, BarChart3, Beaker, Bell, BrainCircuit,
  Calculator, Clock3, FileBarChart, FileSearch, FlaskConical, Gauge,
  Layers3, Plus, Search, Sparkles, Star, TrendingUp, Zap, GitCompare, FileText, SlidersHorizontal,
  ClipboardCheck, Target, UploadCloud, BookOpen, ShieldCheck, CalendarDays, Download, RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import WorkspaceControlCenter from "../components/WorkspaceControlCenter";

const statConfig = [
  { key: "total_experiments", label: "Experiments", icon: FlaskConical },
  { key: "materials", label: "Materials", icon: Beaker },
  { key: "predictions", label: "Predictions", icon: BrainCircuit },
  { key: "research_papers", label: "Papers", icon: FileSearch },
  { key: "reports", label: "Reports", icon: FileBarChart },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/dashboard/summary"), api.get("/materials")])
      .then(([s, m]) => { setSummary(s.data); setMaterials(m.data || []); })
      .catch(() => setError("Couldn't load your workspace. Try refreshing."));
    try { setHistory(JSON.parse(localStorage.getItem("nanomed_calculation_history") || "[]")); } catch { setHistory([]); }
  }, []);

  const firstName = useMemo(() => (user?.full_name || "Researcher").split(" ")[0], [user]);
  const favorites = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("nanomed_favorite_materials") || "[]"); } catch { return []; }
  }, [materials.length]);
  const filteredMaterials = materials.filter(m => `${m.name} ${m.formula}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  const localStats = [
    { label: "Saved calculations", value: history.length, icon: Calculator },
    { label: "Favorite materials", value: favorites.length, icon: Star },
    { label: "Library size", value: materials.length, icon: Layers3 },
  ];

  return (
    <div className="space-y-6 lg:space-y-7">
      {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">{error}</div>}

      <motion.section initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="relative overflow-hidden rounded-[30px] bg-ink text-white p-6 sm:p-8 lg:p-10">
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-beam/20 blur-3xl" />
        <div className="absolute right-40 -bottom-40 w-96 h-96 rounded-full bg-signal/10 blur-3xl" />
        <div className="relative z-10 grid lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white/70 mb-5"><Sparkles size={13} className="text-beam"/> Research workspace</div>
            <p className="text-white/50 text-sm">Good to see you,</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1 tracking-tight">{firstName}.</h1>
            <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl leading-relaxed">A focused workspace for radiation simulations, material intelligence, experiments and research reporting.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => navigate("/dashboard/calculators")} className="btn-primary"><Zap size={17}/> Run calculation <ArrowRight size={15}/></button>
              <button onClick={() => navigate("/dashboard/materials")} className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold hover:bg-white/15 transition flex items-center gap-2"><Plus size={16}/> Add material</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-white/50 mb-3"><Gauge size={14} className="text-beam"/> Workspace pulse</div>
            <div className="grid grid-cols-2 gap-2">
              {localStats.map(({label,value,icon:Icon}) => <div key={label} className="rounded-xl bg-white/[0.05] p-3"><Icon size={15} className="text-signal"/><p className="text-xl font-semibold mt-2">{value}</p><p className="text-[10px] text-white/40">{label}</p></div>)}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {statConfig.map(({key,label,icon:Icon},i)=><motion.div key={key} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}} className="glass-panel-light p-4 sm:p-5 rounded-2xl"><div className="flex items-center justify-between"><div className="w-9 h-9 rounded-xl bg-beam/10 border border-beam/20 flex items-center justify-center"><Icon size={17} className="text-beam"/></div><Activity size={14} className="text-ink/20"/></div><p className="font-display text-2xl font-semibold text-ink mt-4">{summary?.cards?.[key] ?? "—"}</p><p className="text-xs text-ink/45 mt-0.5">{label}</p></motion.div>)}
      </section>

      <section className="glass-panel-light rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div><p className="label-eyebrow">Global search</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Find anything in your workspace</h2></div>
          <div className="relative w-full lg:w-[420px]"><Search size={16} className="absolute left-3 top-3.5 text-ink/35"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search materials, formulas…" className="w-full bg-white border border-ink/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-beam"/></div>
        </div>
        {query && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">{filteredMaterials.map(m=><button key={m.id} onClick={()=>navigate("/dashboard/calculators")} className="text-left rounded-xl border border-ink/10 bg-white p-3 hover:border-beam/30 transition"><p className="text-sm font-semibold text-ink">{m.name}</p><p className="font-mono text-[11px] text-beam mt-1">{m.formula}</p><p className="text-[10px] text-ink/40 mt-1">{m.density} g/cm³ · Use in calculator →</p></button>)}{!filteredMaterials.length&&<p className="text-sm text-ink/40 col-span-full py-3">No matching materials.</p>}</div>}
      </section>

      <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-6">
        <section className="glass-panel-light rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5"><div><div className="flex items-center gap-2"><Clock3 size={16} className="text-beam"/><h2 className="font-display font-semibold text-ink">Recent activity</h2></div><p className="text-xs text-ink/40 mt-1">Latest work and saved calculations.</p></div><button onClick={()=>navigate("/dashboard/experiments")} className="text-xs font-semibold text-beam">View all</button></div>
          <div className="grid md:grid-cols-2 gap-3"><ActivityCard icon={FlaskConical} title="Experiments" items={summary?.recent_experiments} empty="No experiments logged yet" onClick={()=>navigate("/dashboard/experiments")}/><ActivityCard icon={BrainCircuit} title="Predictions" items={summary?.recent_predictions} empty="No predictions yet" onClick={()=>navigate("/dashboard/planner")}/></div>
          {history.length>0&&<div className="mt-3 rounded-2xl border border-ink/10 bg-white/60 p-4"><div className="flex items-center gap-2 mb-3"><Calculator size={15} className="text-beam"/><p className="text-sm font-semibold">Saved calculation history</p></div><div className="grid sm:grid-cols-2 gap-2">{history.slice(0,4).map((h,i)=><button key={h.id||i} onClick={()=>navigate("/dashboard/calculators")} className="text-left rounded-xl bg-white border border-ink/8 p-3 hover:border-beam/25"><p className="text-xs font-semibold truncate">{h.material || "Calculation"}</p><p className="text-[10px] text-ink/40 mt-1">{h.energy} MeV · {h.thickness} cm · {h.createdAt ? new Date(h.createdAt).toLocaleString() : "Saved"}</p></button>)}</div></div>}
        </section>

        <section className="glass-panel-light rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between mb-5"><div><div className="flex items-center gap-2"><Layers3 size={16} className="text-signal"/><h2 className="font-display font-semibold text-ink">Material library</h2></div><p className="text-xs text-ink/40 mt-1">Ready for calculators and simulations.</p></div><button onClick={()=>navigate("/dashboard/materials")} className="text-xs font-semibold text-beam">Manage</button></div><div className="space-y-2.5">{materials.slice(0,6).map(m=><button key={m.id} onClick={()=>navigate("/dashboard/calculators")} className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70 border border-ink/5 hover:border-beam/25 transition text-left"><div className="min-w-0"><p className="text-sm font-semibold truncate">{m.name}</p><p className="text-[11px] font-mono text-beam mt-0.5">{m.formula}</p></div><span className="text-[11px] text-ink/45">{m.density} g/cm³</span></button>)}{!materials.length&&<div className="py-8 text-center text-ink/40 text-xs"><Beaker size={24} className="mx-auto mb-2"/>No materials yet.</div>}</div></section>
      </div>

      <section className="grid xl:grid-cols-[1.15fr_.85fr] gap-6">
        <ResearchChecklist />
        <ResearchToolkit navigate={navigate} />
      </section>

      <WorkspaceControlCenter navigate={navigate} />

      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="label-eyebrow">Research launchpad</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Continue your workflow</h2></div><span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400"><SlidersHorizontal size={12}/> Frontend workspace</span></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickTool icon={Atom} title="Sim Lab" text="Run a material simulation" onClick={()=>navigate("/dashboard/sim-lab")}/>
          <QuickTool icon={Calculator} title="Calculator" text="Attenuation & shielding tools" onClick={()=>navigate("/dashboard/calculators")}/>
          <QuickTool icon={GitCompare} title="Compare materials" text="Review material properties side by side" onClick={()=>navigate("/dashboard/materials")}/>
          <QuickTool icon={BrainCircuit} title="AI Experiment Planner" text="Turn a research goal into a workflow" onClick={()=>navigate("/dashboard/planner")}/>
          <QuickTool icon={FileText} title="Paper Analyzer" text="Organize and inspect research papers" onClick={()=>navigate("/dashboard/paper-analyzer")}/>
          <QuickTool icon={FileBarChart} title="Reports & Analytics" text="Review outputs and activity" onClick={()=>navigate("/dashboard/reports")}/>
        </div>
      </section>

      <div className="fixed bottom-5 right-5 z-20"><button onClick={()=>setNoticeOpen(v=>!v)} className="w-12 h-12 rounded-2xl bg-ink text-white shadow-xl flex items-center justify-center hover:-translate-y-0.5 transition"><Bell size={18}/></button>{noticeOpen&&<div className="absolute right-0 bottom-14 w-72 rounded-2xl bg-white border border-ink/10 shadow-2xl p-4"><p className="font-semibold text-sm">Workspace notifications</p><p className="text-xs text-ink/50 mt-1">Your dashboard is synced with your current account. Saved calculator history is stored locally in this browser.</p></div>}</div>
    </div>
  );
}
function ResearchChecklist() {
  const defaults = [
    { id: "material", label: "Select / verify material", done: false },
    { id: "energy", label: "Define radiation energy", done: false },
    { id: "thickness", label: "Set sample thickness", done: false },
    { id: "simulation", label: "Run attenuation simulation", done: false },
    { id: "report", label: "Review and export results", done: false },
  ];
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nanomed_research_checklist")) || defaults; } catch { return defaults; }
  });
  const toggle = (id) => setItems(prev => {
    const next = prev.map(x => x.id === id ? {...x, done: !x.done} : x);
    localStorage.setItem("nanomed_research_checklist", JSON.stringify(next));
    return next;
  });
  const reset = () => { setItems(defaults); localStorage.setItem("nanomed_research_checklist", JSON.stringify(defaults)); };
  const done = items.filter(x => x.done).length;
  return <section className="glass-panel-light rounded-2xl p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div><p className="label-eyebrow">Research workflow</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Experiment readiness</h2><p className="text-xs text-ink/45 mt-1">A lightweight checklist saved to this browser.</p></div>
      <button onClick={reset} title="Reset checklist" className="rounded-xl border border-ink/10 p-2 text-ink/40 hover:text-beam hover:border-beam/25"><RotateCcw size={15}/></button>
    </div>
    <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-sage-500 to-olive-400 transition-all" style={{width: `${done/items.length*100}%`}} /></div>
    <div className="mt-2 flex justify-between text-[11px] text-ink/45"><span>{done} of {items.length} completed</span><span>{Math.round(done/items.length*100)}%</span></div>
    <div className="mt-4 space-y-2">{items.map(item => <button key={item.id} onClick={()=>toggle(item.id)} className="w-full flex items-center gap-3 rounded-xl border border-ink/7 bg-white/70 p-3 text-left hover:border-beam/25 transition"><span className={`grid h-6 w-6 place-items-center rounded-lg border ${item.done ? "bg-sage-500 border-sage-500 text-white" : "bg-white border-slate-200 text-transparent"}`}><ClipboardCheck size={14}/></span><span className={`text-sm ${item.done ? "line-through text-ink/35" : "text-ink/75"}`}>{item.label}</span></button>)}</div>
  </section>;
}

function ResearchToolkit({navigate}) {
  const tools = [
    [Target, "Define research goal", "Open AI experiment planner", "/dashboard/planner"],
    [BookOpen, "Analyze a paper", "Extract research context", "/dashboard/paper-analyzer"],
    [ShieldCheck, "Radiation workspace", "Run shielding calculations", "/dashboard/calculators"],
    [CalendarDays, "Experiment log", "Record your next run", "/dashboard/experiments"],
  ];
  return <section className="glass-panel-light rounded-2xl p-5 sm:p-6">
    <div><p className="label-eyebrow">Research toolkit</p><h2 className="font-display text-xl font-semibold text-ink mt-1">Tools at a glance</h2><p className="text-xs text-ink/45 mt-1">Jump directly into common research tasks.</p></div>
    <div className="grid sm:grid-cols-2 gap-3 mt-5">{tools.map(([Icon,title,text,to])=><button key={title} onClick={()=>navigate(to)} className="rounded-2xl border border-ink/8 bg-white p-4 text-left hover:border-beam/30 hover:-translate-y-0.5 transition"><div className="w-9 h-9 rounded-xl bg-sage-50 text-sage-600 grid place-items-center"><Icon size={17}/></div><p className="text-sm font-semibold mt-3">{title}</p><p className="text-[11px] text-ink/45 mt-1">{text}</p></button>)}</div>
    <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#0b2940] to-[#123b4a] p-4 text-white flex items-center gap-3"><UploadCloud size={19} className="text-sage-300"/><div className="min-w-0"><p className="text-sm font-semibold">Data import ready</p><p className="text-[10px] text-white/50">Use your existing experiment/data pages to upload and analyze readings.</p></div></div>
  </section>;
}

function ActivityCard({icon:Icon,title,items,empty,onClick}){return <button onClick={onClick} className="text-left rounded-2xl border border-ink/8 bg-white/60 p-4 hover:bg-white hover:border-beam/20 transition w-full"><div className="flex items-center gap-2 mb-3"><Icon size={15} className="text-beam"/><p className="text-sm font-semibold">{title}</p></div>{items?.length?<div className="space-y-2">{items.slice(0,4).map((item,i)=><div key={i} className="flex items-center gap-2.5 text-xs text-ink/65"><span className="w-1.5 h-1.5 rounded-full bg-beam"/><span className="truncate">{item.name||item.title||item.id||"Activity"}</span></div>)}</div>:<p className="text-xs text-ink/35">{empty}</p>}</button>}
function QuickTool({icon:Icon,title,text,onClick}){return <button onClick={onClick} className="glass-panel-light p-4 rounded-2xl text-left hover:-translate-y-0.5 hover:border-beam/30 transition"><div className="w-9 h-9 rounded-xl bg-beam/10 flex items-center justify-center"><Icon size={17} className="text-beam"/></div><p className="font-semibold text-sm mt-3">{title}</p><p className="text-xs text-ink/45 mt-1">{text}</p></button>}
