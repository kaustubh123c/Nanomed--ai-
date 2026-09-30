import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Activity, AlertCircle, Atom, BarChart3, Beaker, BookOpen, Calculator,
  Check, CheckCircle2, ChevronRight, Clock3, Database, FileSpreadsheet,
  FileText, FlaskConical, FolderOpen, GitCompare, LineChart, Plus, Search,
  Sparkles, Target, Trash2, UploadCloud, X
} from 'lucide-react';

function Metric({label,value,sub,icon:Icon}){
  return <div className="glass-panel-light rounded-2xl p-4 border border-slate-200/80">
    <div className="flex items-center justify-between"><span className="text-xs text-ink/45">{label}</span><Icon size={16} className="text-sage-600"/></div>
    <p className="font-display text-2xl font-semibold text-ink mt-2">{value}</p>
    <p className="text-[11px] text-ink/40 mt-1">{sub}</p>
  </div>
}

const starterMilestones = [
  {title:'Define research objective',done:false},
  {title:'Select material and radiation energy',done:false},
  {title:'Run baseline simulation',done:false},
  {title:'Import experimental readings',done:false},
  {title:'Compare experiment vs simulation',done:false},
  {title:'Prepare research report',done:false},
];

export default function ResearchWorkspace(){
  const navigate = useNavigate();
  const [projects,setProjects] = useState([]);
  const [summary,setSummary] = useState(null);
  const [activity,setActivity] = useState([]);
  const [notifications,setNotifications] = useState([]);
  const [datasets,setDatasets] = useState([]);
  const [query,setQuery] = useState('');
  const [selected,setSelected] = useState(null);
  const [milestones,setMilestones] = useState([]);
  const [newMilestone,setNewMilestone] = useState('');
  const [quality,setQuality] = useState(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const [p,s,a,n,d] = await Promise.all([
        api.get('/research-workspace/projects'),
        api.get('/research-workspace/summary'),
        api.get('/research-workspace/activity'),
        api.get('/research-workspace/notifications'),
        api.get('/research-workspace/files'),
      ]);
      setProjects(p.data); setSummary(s.data); setActivity(a.data); setNotifications(n.data); setDatasets(d.data);
      if (!selected && p.data[0]) setSelected(p.data[0]);
    } catch { setError('Could not load the research workspace from the backend.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if (!selected) { setMilestones([]); return; }
    api.get(`/research-workspace/projects/${selected.id}/milestones`).then(r=>setMilestones(r.data.items || [])).catch(()=>setMilestones([]));
  },[selected?.id]);

  const filtered = useMemo(()=>projects.filter(p=>`${p.name} ${p.material_name || ''} ${p.status} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase())),[projects,query]);

  const createProject = async () => {
    try {
      setBusy(true); setError('');
      const res = await api.post('/research-workspace/projects',{name:`Research Project ${projects.length+1}`,status:'Draft',tags:[]});
      const project = res.data;
      setProjects(prev=>[project,...prev]); setSelected(project);
      await api.put(`/research-workspace/projects/${project.id}/milestones`,{items:starterMilestones});
      setMilestones(starterMilestones);
      setSummary(prev=>prev?{...prev,projects:(prev.projects||0)+1}:prev);
    } catch { setError('Unable to create project.'); }
    finally { setBusy(false); }
  };

  const saveMilestones = async (items) => {
    if (!selected) return;
    setMilestones(items);
    const done = items.filter(x=>x.done).length;
    const progress = items.length ? Math.round(done/items.length*100) : selected.progress;
    try {
      await api.put(`/research-workspace/projects/${selected.id}/milestones`,{items});
      const res = await api.patch(`/research-workspace/projects/${selected.id}`,{progress,status:progress>=100?'Completed':selected.status});
      setSelected(res.data); setProjects(prev=>prev.map(p=>p.id===res.data.id?res.data:p));
    } catch { setError('Could not save milestone progress.'); }
  };

  const addMilestone = () => {
    const title = newMilestone.trim(); if (!title) return;
    saveMilestones([...milestones,{title,done:false}]); setNewMilestone('');
  };

  const importData = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file',file); if(selected) fd.append('project_id',selected.id);
    try {
      setBusy(true); setError('');
      const res = await api.post('/research-workspace/import',fd,{headers:{'Content-Type':'multipart/form-data'}});
      setDatasets(prev=>[res.data,...prev]); setSummary(prev=>prev?{...prev,files:(prev.files||0)+1}:prev);
      setQuality(null);
      const updated = milestones.map(x=>x.title.toLowerCase().includes('import')?{...x,done:true}:x);
      if(updated.length) await saveMilestones(updated);
    } catch { setError('Data import failed. Please check the CSV/Excel format.'); }
    finally { setBusy(false); }
  };

  const inspectQuality = async (id) => {
    try { const res = await api.get(`/research-workspace/files/${id}/quality`); setQuality(res.data); }
    catch { setError('Could not calculate dataset quality.'); }
  };

  const deleteProject = async () => {
    if(!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    try {
      await api.delete(`/research-workspace/projects/${selected.id}`);
      const rest=projects.filter(p=>p.id!==selected.id); setProjects(rest); setSelected(rest[0]||null); setMilestones([]);
    } catch { setError('Unable to delete project.'); }
  };

  return <div className="space-y-6">
    <section className="rounded-3xl bg-gradient-to-br from-[#0a2638] via-[#0c4650] to-[#08746f] p-6 sm:p-8 text-white shadow-xl overflow-hidden relative">
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-sage-200/10 blur-3xl"/>
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div><p className="text-[10px] uppercase tracking-[.25em] text-sage-200/70">Research workspace</p><h1 className="font-display text-3xl sm:text-4xl font-semibold mt-2">Your complete radiation research desk.</h1><p className="text-sm text-white/65 max-w-2xl mt-3">Projects, experiments, materials, datasets, simulations and reports — connected to your authenticated workspace.</p></div>
        <button disabled={busy} onClick={createProject} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0b2940] px-4 py-3 text-sm font-semibold hover:bg-sage-50 disabled:opacity-50"><Plus size={17}/> New project</button>
      </div>
    </section>

    {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-xs"><AlertCircle size={15}/>{error}<button className="ml-auto" onClick={()=>setError('')}><X size={14}/></button></div>}

    <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <Metric label="Projects" value={summary?.projects ?? projects.length} sub="Research workspaces" icon={FolderOpen}/>
      <Metric label="Experiments" value={summary?.experiments ?? 0} sub="Saved experimental runs" icon={FlaskConical}/>
      <Metric label="Materials" value={summary?.materials ?? 0} sub="Material library" icon={Beaker}/>
      <Metric label="Datasets" value={summary?.files ?? datasets.length} sub="Imported readings" icon={Database}/>
      <Metric label="Readiness" value={`${summary?.analysis_readiness ?? 0}%`} sub="Project completion" icon={Target}/>
    </div>

    <section className="grid xl:grid-cols-[1.15fr_.85fr] gap-6">
      <div className="glass-panel-light rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="label-eyebrow">Project hub</p><h2 className="font-display text-xl font-semibold mt-1">Research projects</h2></div><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects, tags…" className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-sage-400"/></div></div>
        <div className="mt-4 space-y-2 max-h-[430px] overflow-y-auto pr-1">{loading?<div className="py-10 text-center text-xs text-ink/40">Loading workspace…</div>:filtered.map(p=><button key={p.id} onClick={()=>setSelected(p)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id===p.id?'border-sage-400 bg-sage-50/50 shadow-sm':'border-ink/8 bg-white hover:border-sage-300'}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-sm truncate">{p.name}</p><p className="text-[11px] text-ink/45 mt-1">{p.material_name || 'Material not linked'} · {p.energy_kev ? `${p.energy_kev} keV` : 'Energy not set'}</p></div><span className="rounded-full bg-sage-50 text-sage-700 px-2 py-1 text-[10px] font-semibold">{p.status}</span></div><div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-sage-500 rounded-full" style={{width:`${p.progress}%`}}/></div><div className="mt-1 flex justify-between text-[10px] text-ink/35"><span>{(p.tags||[]).length ? p.tags.join(' · ') : 'Research project'}</span><span>{p.progress}%</span></div></button>)}{!filtered.length&&<div className="py-10 text-center text-xs text-ink/40">No matching projects.</div>}</div>
      </div>

      <div className="glass-panel-light rounded-2xl p-5">
        <div className="flex items-center justify-between"><div><p className="label-eyebrow">Project control</p><h2 className="font-display text-xl font-semibold mt-1 truncate max-w-[300px]">{selected?.name || 'Select a project'}</h2></div>{selected&&<button onClick={deleteProject} title="Delete project" className="rounded-lg p-2 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>}</div>
        {selected ? <>
          <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] text-ink/40">Status</span><p className="text-xs font-semibold mt-1">{selected.status}</p></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] text-ink/40">Progress</span><p className="text-xs font-semibold mt-1">{selected.progress}%</p></div></div>
          <div className="mt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Research milestones</p><p className="text-[10px] text-ink/40 mt-0.5">Progress is synchronized with the backend.</p></div><span className="text-[10px] font-semibold text-sage-700">{milestones.filter(x=>x.done).length}/{milestones.length}</span></div>
            <div className="mt-3 space-y-2">{milestones.map((m,i)=><button key={`${m.title}-${i}`} onClick={()=>saveMilestones(milestones.map((x,j)=>j===i?{...x,done:!x.done}:x))} className="w-full flex items-center gap-2 rounded-lg border border-slate-100 p-2.5 text-left hover:border-sage-200"><span className={`w-5 h-5 rounded-full grid place-items-center border ${m.done?'bg-sage-600 border-sage-600 text-white':'border-slate-300 text-transparent'}`}><Check size={12}/></span><span className={`text-[11px] flex-1 ${m.done?'line-through text-ink/35':'text-ink'}`}>{m.title}</span></button>)}</div>
            <div className="flex gap-2 mt-3"><input value={newMilestone} onChange={e=>setNewMilestone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMilestone()} placeholder="Add a milestone…" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-sage-400"/><button onClick={addMilestone} className="rounded-lg bg-ink text-white px-3 text-xs"><Plus size={14}/></button></div>
          </div>
        </> : <div className="py-16 text-center text-xs text-ink/40">Choose a project to manage milestones.</div>}
      </div>
    </section>

    <section className="grid xl:grid-cols-[.9fr_1.1fr] gap-6">
      <div className="glass-panel-light rounded-2xl p-5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-sage-50 text-sage-700 grid place-items-center"><Activity size={17}/></div><div><p className="label-eyebrow">Workspace feed</p><h2 className="font-display text-xl font-semibold mt-1">Recent activity</h2></div></div><div className="mt-4 space-y-2">{activity.length?activity.slice(0,8).map((x,i)=><div key={i} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3"><span className="w-8 h-8 rounded-lg bg-slate-50 grid place-items-center text-sage-700">{x.type==='dataset'?<Database size={15}/>:x.type==='paper'?<BookOpen size={15}/>:x.type==='experiment'?<FlaskConical size={15}/>:<FolderOpen size={15}/>}</span><div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{x.title}</p><p className="text-[10px] text-ink/35">{x.label} · {x.timestamp ? new Date(x.timestamp).toLocaleString() : 'Recent'}</p></div></div>):<p className="py-8 text-center text-xs text-ink/40">No recent activity yet.</p>}</div></div>

      <div className="glass-panel-light rounded-2xl p-5"><div className="flex items-center justify-between"><div><p className="label-eyebrow">Research alerts</p><h2 className="font-display text-xl font-semibold mt-1">Workspace notifications</h2></div><span className="text-[10px] rounded-full bg-sage-50 text-sage-700 px-2 py-1">{notifications.length} items</span></div><div className="mt-4 grid sm:grid-cols-2 gap-2">{notifications.map((n,i)=><div key={i} className="rounded-xl border border-slate-100 bg-white p-3"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${n.severity==='success'?'bg-emerald-500':n.severity==='attention'?'bg-amber-500':'bg-sage-500'}`}/><p className="text-xs font-semibold">{n.title}</p></div><p className="text-[10px] text-ink/45 mt-2 leading-relaxed">{n.message}</p></div>)}</div></div>
    </section>

    <section className="glass-panel-light rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 grid place-items-center"><Database size={19}/></div><div><p className="label-eyebrow">Data center</p><h2 className="font-display text-xl font-semibold mt-1">Experimental readings</h2></div></div><label className="inline-flex items-center gap-2 rounded-xl bg-ink text-white px-4 py-2.5 text-xs font-semibold cursor-pointer hover:bg-slate-800"><UploadCloud size={14}/> Import CSV / Excel<input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={busy} onChange={e=>importData(e.target.files?.[0])}/></label></div>
      <div className="mt-4 grid lg:grid-cols-[1fr_1fr] gap-4"><div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center"><FileSpreadsheet size={28} className="mx-auto text-sage-600"/><p className="text-sm font-semibold mt-3">Bring your detector readings into the workspace</p><p className="text-xs text-ink/40 mt-1">CSV, XLSX and XLS files are parsed by the backend and linked to the selected project.</p></div><div className="space-y-2 max-h-48 overflow-y-auto">{datasets.slice(0,5).map(d=><button key={d.id} onClick={()=>inspectQuality(d.id)} className="w-full flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left hover:border-sage-300"><FileText size={16} className="text-sage-600"/><span className="flex-1 min-w-0"><b className="block text-xs truncate">{d.filename}</b><small className="text-[10px] text-ink/40">{d.rows} rows · {d.columns} columns</small></span><BarChart3 size={15} className="text-slate-300"/></button>)}{!datasets.length&&<p className="py-8 text-center text-xs text-ink/40">No datasets imported yet.</p>}</div></div>
      {quality&&<div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/50 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Dataset quality snapshot</p><p className="text-[10px] text-ink/40 mt-1">Preview-based checks from the backend</p></div><div className="text-right"><p className="text-xl font-semibold text-sage-700">{quality.completeness_preview_pct}%</p><p className="text-[9px] text-ink/40">preview completeness</p></div></div><div className="grid sm:grid-cols-3 gap-2 mt-3"><div className="bg-white rounded-lg p-2.5"><span className="text-[9px] text-ink/40">Rows</span><p className="text-xs font-semibold">{quality.rows}</p></div><div className="bg-white rounded-lg p-2.5"><span className="text-[9px] text-ink/40">Columns</span><p className="text-xs font-semibold">{quality.columns}</p></div><div className="bg-white rounded-lg p-2.5"><span className="text-[9px] text-ink/40">Numeric fields</span><p className="text-xs font-semibold">{quality.numeric_summary?.length || 0}</p></div></div></div>}
    </section>

    <section><div className="flex items-center justify-between mb-3"><div><p className="label-eyebrow">Research toolkit</p><h2 className="font-display text-xl font-semibold mt-1">Move from question to result</h2></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">{[[GitCompare,'Compare materials','/dashboard/materials'],[LineChart,'Data analytics','/dashboard/analytics'],[Sparkles,'AI experiment planner','/dashboard/planner'],[BookOpen,'Paper analyzer','/dashboard/paper-analyzer'],[Calculator,'Radiation calculator','/dashboard/calculators'],[Atom,'Virtual Sim Lab','/dashboard/sim-lab']].map(([I,t,to])=><button key={t} onClick={()=>navigate(to)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sage-300 hover:shadow-sm transition"><span className="w-9 h-9 rounded-xl bg-sage-50 text-sage-700 grid place-items-center"><I size={17}/></span><b className="block text-xs mt-3">{t}</b><span className="text-[10px] text-ink/40 mt-1 flex items-center gap-1">Open tool <ChevronRight size={11}/></span></button>)}</div></section>
  </div>;
}
