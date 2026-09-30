import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FlaskConical, Beaker, Atom, BrainCircuit, Calculator,
  FileSearch, FileBarChart, BarChart3, Settings, ShieldCheck, LogOut,
  Menu, X, Search, UserCircle, Command, Plus, ChevronRight, FolderOpen,
  History, PanelLeftClose, PanelLeftOpen, Sparkles, Activity, Microscope
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OriginalChatbot from "../components/OriginalChatbot";

const groups = [
  { title: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  { title: "Research", items: [
    { to: "/dashboard/workspace", label: "Research Workspace", icon: FolderOpen },
    { to: "/dashboard/research-studio", label: "Research Studio", icon: FlaskConical },
    { to: "/dashboard/paper-analyzer", label: "Paper Analyzer", icon: FileSearch },
  ]},
  { title: "Laboratory", items: [
    { to: "/dashboard/materials", label: "Materials", icon: Beaker },
    { to: "/dashboard/experiments", label: "Experiments", icon: FlaskConical },
    { to: "/dashboard/sim-lab", label: "Sim Lab", icon: Atom },
  ]},
  { title: "Analysis", items: [
    { to: "/dashboard/calculators", label: "Calculators", icon: Calculator },
    { to: "/dashboard/calculation-history", label: "Calculation History", icon: History },
    { to: "/dashboard/planner", label: "AI Experiment Planner", icon: BrainCircuit },
    { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  ]},
  { title: "Outputs", items: [{ to: "/dashboard/reports", label: "Reports", icon: FileBarChart }] },
  { title: "System", items: [{ to: "/dashboard/settings", label: "Settings", icon: Settings }] },
];

const flatItems = groups.flatMap(g => g.items);

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("nanomed_sidebar_collapsed") === "1");
  const [search, setSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("nanomed_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(v => !v); }
      if (e.key === "Escape") { setCommandOpen(false); setQuickOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const current = flatItems.find(item => location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to)));
  const pageTitle = current?.label || "Research Workspace";

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex h-full flex-col">
      <div className={`px-4 py-5 ${collapsed && !mobile ? "lg:px-3" : ""}`}>
        <div className={`flex items-center ${collapsed && !mobile ? "justify-center" : "gap-3"}`}>
          <div className="nm-brand-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-lg">
            <Atom className="text-sage-300" size={21} />
          </div>
          {(!collapsed || mobile) && <div className="min-w-0">
            <div className="font-display text-lg font-semibold tracking-tight text-white">NanoMed<span className="nm-brand-accent"> AI</span></div>
            <div className="text-[9px] uppercase tracking-[.2em] text-white/35">Radiation Intelligence</div>
          </div>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.map(group => <div key={group.title} className="mb-4">
          {(!collapsed || mobile) && <div className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[.2em] text-white/25">{group.title}</div>}
          {group.items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} title={collapsed && !mobile ? label : undefined}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nm-nav-link group flex items-center rounded-xl text-sm font-medium transition ${collapsed && !mobile ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"} ${isActive ? "nm-nav-active" : "text-white/55 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={18} className="shrink-0" />
            {(!collapsed || mobile) && <><span className="truncate">{label}</span>{label === "AI Experiment Planner" && <Sparkles size={12} className="ml-auto text-clay-300/70" />}</>}
          </NavLink>)}
        </div>)}
        {user?.role === "admin" && <NavLink to="/dashboard/admin" title={collapsed && !mobile ? "Admin Panel" : undefined} onClick={() => setMobileOpen(false)} className={({isActive}) => `nm-nav-link flex items-center rounded-xl text-sm font-medium transition ${collapsed && !mobile ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5"} ${isActive ? "nm-nav-active" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><ShieldCheck size={18}/>{(!collapsed || mobile) && "Admin Panel"}</NavLink>}
      </nav>

      <div className="border-t border-white/10 p-3">
        {(!collapsed || mobile) && <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[.035] px-3 py-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-signal/50 bg-signal/20 text-sm font-semibold text-signal">{user?.full_name?.[0]?.toUpperCase() || "R"}</div>
          <div className="min-w-0"><p className="truncate text-sm text-white">{user?.full_name || "Researcher"}</p><p className="text-xs capitalize text-white/35">{user?.role || "user"}</p></div>
        </div>}
        <button onClick={handleLogout} title={collapsed && !mobile ? "Logout" : undefined} className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/5 hover:text-white ${collapsed && !mobile ? "justify-center px-2" : "gap-3 px-3"}`}><LogOut size={18}/>{(!collapsed || mobile) && "Logout"}</button>
      </div>
    </div>
  );

  return <div className="min-h-screen bg-mist flex">
    <aside className={`nm-app-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 shadow-2xl lg:flex ${collapsed ? "w-[76px]" : "w-[264px]"}`}><SidebarContent /></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><aside className="nm-app-sidebar flex h-full w-[280px] flex-col shadow-2xl"><SidebarContent mobile /></aside><div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)}/></div>}

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="nm-topbar sticky top-0 z-30 border-b px-4 py-3.5 backdrop-blur-2xl lg:px-7">
        <div className="flex items-center gap-3">
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white lg:hidden" onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={19}/> : <Menu size={19}/>}</button>
          <button className="hidden h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white text-ink/60 hover:text-sage-700 lg:grid" onClick={() => setCollapsed(v => !v)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{pageTitle}</p><p className="hidden text-[10px] tracking-wide text-ink/40 sm:block">Material science · shielding · simulation</p></div>
        </div>
        <div className="mx-3 hidden max-w-xl flex-1 md:flex">
          <div className="relative w-full"><Search size={15} className="absolute left-3 top-3 text-ink/35"/><input value={search} onFocus={() => setCommandOpen(true)} onChange={e => setSearch(e.target.value)} onKeyDown={e => {if(e.key === "Enter" && search.trim()){navigate("/dashboard/materials");setCommandOpen(false);}}} placeholder="Search workspace…" className="w-full rounded-xl border border-ink/10 bg-white/75 py-2.5 pl-9 pr-20 text-xs outline-none shadow-sm focus:border-sage-400 focus:ring-4 focus:ring-sage-400/10"/><span className="absolute right-2 top-1.5 hidden items-center gap-1 rounded-lg border border-ink/10 bg-white px-2 py-1 text-[10px] font-mono text-ink/35 lg:inline-flex"><Command size={11}/> K</span></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="nm-system-ready hidden xl:flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-wider"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal"/> System ready</div>
          <div className="relative"><button onClick={() => setQuickOpen(v => !v)} className="hidden items-center gap-2 rounded-xl bg-sage-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-700 sm:flex"><Plus size={15}/> Quick create</button>{quickOpen && <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl"><QuickAction label="New material" icon={Beaker} onClick={() => {navigate("/dashboard/materials");setQuickOpen(false)}}/><QuickAction label="New experiment" icon={FlaskConical} onClick={() => {navigate("/dashboard/experiments");setQuickOpen(false)}}/><QuickAction label="Run calculator" icon={Calculator} onClick={() => {navigate("/dashboard/calculators");setQuickOpen(false)}}/><QuickAction label="Open Sim Lab" icon={Atom} onClick={() => {navigate("/dashboard/sim-lab");setQuickOpen(false)}}/></div>}</div>
          <button onClick={() => navigate("/dashboard/settings")} title="Profile & settings" className="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white text-ink/55 hover:text-sage-700"><UserCircle size={18}/></button>
          <span className="hidden rounded-full border border-signal/25 bg-signal/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wide text-signal sm:inline-flex">{user?.role || "user"}</span>
        </div>
      </header>

      <div className="nm-page-rail"><div className="nm-page-meta"><span className="nm-live-dot"/> Research environment <span className="hidden sm:inline">/</span> {pageTitle}</div></div>
      <main className="flex-1 px-4 pb-10 pt-2 lg:px-7"><Outlet /></main>
      <OriginalChatbot />
    </div>

    {commandOpen && <div className="fixed inset-0 z-[70] bg-ink/35 p-4 backdrop-blur-sm sm:p-8" onMouseDown={e => {if(e.target === e.currentTarget) setCommandOpen(false)}}><div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl"><div className="flex items-center gap-3 border-b border-ink/8 px-5 py-4"><Search size={18} className="text-sage-600"/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials, experiments, tools…" className="flex-1 bg-transparent text-sm outline-none"/><kbd className="rounded-lg border border-ink/10 px-2 py-1 text-[10px] text-ink/35">ESC</kbd></div><div className="p-3"><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[.18em] text-ink/35">Navigate</p>{flatItems.map(({to,label,icon:Icon}) => <button key={to} onClick={() => {navigate(to);setCommandOpen(false);setSearch("")}} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-ink hover:bg-sage-50 hover:text-sage-700"><Icon size={17}/><span className="flex-1">{label}</span><ChevronRight size={14} className="text-ink/20"/></button>)}</div></div></div>}
  </div>;
}

function QuickAction({label, icon:Icon, onClick}) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-ink hover:bg-sage-50 hover:text-sage-700"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sage-50 text-sage-600"><Icon size={15}/></span>{label}</button>; }
