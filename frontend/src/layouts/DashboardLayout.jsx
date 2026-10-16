import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FlaskConical, Beaker, Atom, BrainCircuit, Calculator, FileSearch, FileBarChart,
  BarChart3, Settings, ShieldCheck, LogOut, Menu, X, Search, Command, Plus, ChevronRight, ChevronDown,
  FolderOpen, History, Microscope, Ribbon, Crosshair, Pill, Layers3, Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OriginalChatbot from "../components/OriginalChatbot";
import ErrorBoundary from "../components/ErrorBoundary";

/* Top-navigation structure: a few focused menus instead of a long sidebar. */
const menus = [
  { id: "oncology", title: "Oncology", icon: Ribbon, accent: true, items: [
    { to: "/dashboard/oncology", label: "Cancer Hub", desc: "Tumour sites & regimens", icon: Ribbon, end: true },
    { to: "/dashboard/oncology/dose-lab", label: "Tumor Dose Lab", desc: "Nanoparticle dose enhancement", icon: Crosshair },
    { to: "/dashboard/oncology/radiosensitizers", label: "Radiosensitizers", desc: "Materials & modalities guide", icon: Pill },
  ]},
  { id: "physics", title: "Simulation", icon: Atom, items: [
    { to: "/dashboard/sim-lab", label: "Sim Lab", desc: "Beam & multi-material runs", icon: Atom },
    { to: "/dashboard/calculators", label: "Calculators", desc: "Attenuation & shielding tools", icon: Calculator },
    { to: "/dashboard/calculation-history", label: "Calculation History", desc: "Saved results", icon: History },
    { to: "/dashboard/materials", label: "Materials", desc: "Nanomaterial library", icon: Beaker },
    { to: "/dashboard/experiments", label: "Experiments", desc: "Log and compare runs", icon: FlaskConical },
  ]},
  { id: "research", title: "Research", icon: Microscope, items: [
    { to: "/dashboard/workspace", label: "Research Workspace", desc: "Projects & milestones", icon: FolderOpen },
    { to: "/dashboard/research-studio", label: "Research Studio", desc: "Plan a study", icon: Microscope },
    { to: "/dashboard/planner", label: "AI Experiment Planner", desc: "Material & thickness advice", icon: BrainCircuit },
    { to: "/dashboard/paper-analyzer", label: "Paper Analyzer", desc: "Summarise PDFs", icon: FileSearch },
  ]},
  { id: "insights", title: "Insights", icon: BarChart3, items: [
    { to: "/dashboard/analytics", label: "Analytics", desc: "Trends across your lab", icon: BarChart3 },
    { to: "/dashboard/reports", label: "Reports", desc: "Generated PDF reports", icon: FileBarChart },
  ]},
];
const home = { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true };
const settingsItem = { to: "/dashboard/settings", label: "Settings", icon: Settings };
const flatItems = [home, ...menus.flatMap((m) => m.items), settingsItem, { to: "/dashboard/admin", label: "Admin Panel", icon: ShieldCheck }];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [userOpen, setUserOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState("");
  const barRef = useRef(null);

  useEffect(() => { setOpenMenu(null); setUserOpen(false); setQuickOpen(false); setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen((v) => !v); }
      if (e.key === "Escape") { setCommandOpen(false); setOpenMenu(null); setUserOpen(false); setQuickOpen(false); }
    };
    const onClick = (e) => { if (barRef.current && !barRef.current.contains(e.target)) { setOpenMenu(null); setUserOpen(false); setQuickOpen(false); } };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);

  const current = flatItems
    .filter((i) => location.pathname === i.to || (i.to !== "/dashboard" && location.pathname.startsWith(i.to + "/")))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const pageTitle = current?.label || "Dashboard";
  const activeMenu = menus.find((m) => m.items.some((i) => i === current))?.id;
  const go = (to) => { navigate(to); setCommandOpen(false); setSearch(""); };
  const filtered = flatItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()) && (i.to !== "/dashboard/admin" || user?.role === "admin"));

  const topLink = "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition";

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header ref={barRef} className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 lg:px-7">
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <span className="nm-brand-icon grid h-9 w-9 place-items-center rounded-xl border"><Atom size={19} /></span>
            <span className="hidden font-display text-lg font-semibold tracking-tight text-ink sm:block">NanoMed<span className="text-sage-600"> AI</span></span>
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            <NavLink to={home.to} end className={({ isActive }) => `${topLink} ${isActive ? "bg-sage-50 text-sage-700" : "text-ink/65 hover:bg-sage-50 hover:text-ink"}`}>Dashboard</NavLink>
            {menus.map((m) => (
              <div key={m.id} className="relative">
                <button onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                  className={`${topLink} ${activeMenu === m.id ? "bg-sage-50 text-sage-700" : "text-ink/65 hover:bg-sage-50 hover:text-ink"} ${m.accent ? "!text-ribbon-600 hover:!bg-ribbon-50" : ""} ${m.accent && activeMenu === m.id ? "!bg-ribbon-50" : ""}`}>
                  <m.icon size={15} />{m.title}<ChevronDown size={13} className={`transition ${openMenu === m.id ? "rotate-180" : ""}`} />
                </button>
                {openMenu === m.id && (
                  <div className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl">
                    {m.items.map(({ to, label, desc, icon: Icon, end }) => (
                      <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${isActive ? "bg-sage-50" : "hover:bg-sage-50"}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.accent ? "bg-ribbon-50 text-ribbon-500" : "bg-sage-50 text-sage-600"}`}><Icon size={16} /></span>
                        <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{label}</span><span className="block truncate text-[11px] text-ink/45">{desc}</span></span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink/45 hover:border-sage-300 md:flex">
              <Search size={14} /> Search <span className="ml-3 inline-flex items-center gap-0.5 rounded border border-ink/10 px-1.5 font-mono text-[10px]"><Command size={10} />K</span>
            </button>
            <div className="relative">
              <button onClick={() => setQuickOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl bg-sage-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-700"><Plus size={15} /><span className="hidden sm:inline">New</span></button>
              {quickOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl">
                  {[["Tumor dose scenario", Crosshair, "/dashboard/oncology/dose-lab"], ["New material", Beaker, "/dashboard/materials"], ["New experiment", FlaskConical, "/dashboard/experiments"], ["Run simulation", Atom, "/dashboard/sim-lab"], ["Run calculator", Calculator, "/dashboard/calculators"]].map(([l, I, to]) => (
                    <button key={l} onClick={() => go(to)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-ink hover:bg-sage-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sage-50 text-sage-600"><I size={15} /></span>{l}</button>))}
                </div>)}
            </div>
            <div className="relative">
              <button onClick={() => setUserOpen((v) => !v)} className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white py-1.5 pl-1.5 pr-2.5 hover:border-sage-300">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-sage-600 text-xs font-semibold text-white">{user?.full_name?.[0]?.toUpperCase() || "R"}</span>
                <span className="hidden text-left sm:block"><span className="block max-w-[110px] truncate text-xs font-semibold leading-tight text-ink">{user?.full_name || "Researcher"}</span><span className="block text-[10px] capitalize leading-tight text-ink/40">{user?.role || "user"}</span></span>
                <ChevronDown size={13} className="text-ink/40" />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl">
                  <div className="px-3 py-2"><p className="truncate text-sm font-semibold text-ink">{user?.full_name}</p><p className="truncate text-[11px] text-ink/45">{user?.email}</p></div>
                  <div className="my-1 h-px bg-ink/10" />
                  <button onClick={() => go("/dashboard/settings")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink hover:bg-sage-50"><Settings size={15} />Settings</button>
                  {user?.role === "admin" && <button onClick={() => go("/dashboard/admin")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink hover:bg-sage-50"><ShieldCheck size={15} />Admin panel</button>}
                  <button onClick={() => { logout(); navigate("/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ribbon-600 hover:bg-ribbon-50"><LogOut size={15} />Log out</button>
                </div>)}
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-ink/10 bg-white/60">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2 text-xs text-ink/50 lg:px-7">
          <Layers3 size={13} /> <span>Workspace</span><ChevronRight size={12} />
          {activeMenu && <><span className="capitalize">{menus.find((m) => m.id === activeMenu).title}</span><ChevronRight size={12} /></>}
          <span className="font-semibold text-ink">{pageTitle}</span>
        </div>
      </div>

      <main className="flex-1 px-4 pb-12 pt-6 lg:px-7"><ErrorBoundary resetKey={location.pathname}><Outlet /></ErrorBoundary></main>
      <OriginalChatbot />

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[300px] overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><span className="font-display text-lg font-semibold text-ink">NanoMed AI</span><button onClick={() => setMobileOpen(false)} className="rounded-lg border border-ink/10 p-1.5"><X size={17} /></button></div>
            {[{ title: "Overview", items: [home] }, ...menus, { title: "System", items: [settingsItem] }].map((g) => (
              <div key={g.title} className="mb-4">
                <p className={`px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.18em] ${g.accent ? "text-ribbon-500" : "text-ink/35"}`}>{g.title}</p>
                {g.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-sage-50 text-sage-700" : "text-ink/70 hover:bg-sage-50"}`}><Icon size={17} />{label}</NavLink>))}
              </div>))}
          </aside>
        </div>
      )}

      {commandOpen && (
        <div className="fixed inset-0 z-[70] bg-ink/35 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && setCommandOpen(false)}>
          <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4"><Search size={18} className="text-sage-600" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && filtered[0] && go(filtered[0].to)} placeholder="Jump to a page…" className="flex-1 bg-transparent text-sm outline-none" />
              <kbd className="rounded-lg border border-ink/10 px-2 py-1 text-[10px] text-ink/40">ESC</kbd></div>
            <div className="max-h-[60vh] overflow-y-auto p-3">{filtered.map(({ to, label, icon: Icon }) => (
              <button key={to} onClick={() => go(to)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-ink hover:bg-sage-50"><Icon size={17} className="text-sage-600" /><span className="flex-1">{label}</span><ChevronRight size={14} className="text-ink/20" /></button>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
