import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Radiation, Zap, Pill, Crosshair, ExternalLink } from "lucide-react";
import api from "../../lib/api";

const MODALITIES = [
  { icon: Radiation, name: "External beam (EBRT / IMRT)", text: "Megavoltage photons delivered in daily fractions. At MV energies Compton interactions dominate, so high-Z enhancement is small - nanoparticles need kV-range beams or local delivery." },
  { icon: Crosshair, name: "SBRT / SRS", text: "Few, high-dose fractions with sub-millimetre accuracy for lung, liver, spine and brain. Large dose per fraction makes the LQ model less reliable." },
  { icon: Zap, name: "Brachytherapy", text: "Sealed sources placed in or next to the tumour. Low-energy isotopes (I-125, Pd-103, Ir-192) sit where the photoelectric advantage of Au / Gd is strongest." },
  { icon: Pill, name: "Radioligand & radioembolisation", text: "Y-90, Lu-177 and I-131 deliver dose from within. Nanocarriers can improve tumour retention and imaging (theranostics)." },
];

const FACTS = [
  ["Why high-Z?", "Photoelectric absorption scales roughly as Z³-Z⁴ per atom. Gold (Z=79) absorbs kV photons far more strongly than soft tissue (Z≈7.4), releasing Auger and photo-electrons locally."],
  ["Best energy range", "Largest gains just above a K-edge: Gd ≈ 50 keV, Hf ≈ 65 keV, Pt ≈ 78 keV, Au ≈ 81 keV, Bi ≈ 90 keV."],
  ["Uptake matters", "Mass fraction in the tumour (mg per g) sets the scale of the effect; 5-10 mg/g is a commonly modelled range."],
  ["Beyond physics", "Radiosensitisation also involves oxidative stress, DNA-repair inhibition and cell-cycle effects that a pure dose model cannot capture."],
];

export default function Radiosensitizers() {
  const [nps, setNps] = useState([]);
  useEffect(() => { api.get("/oncology/nanoparticles").then((r) => setNps(r.data.items)).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow">Oncology</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Radiosensitizer guide</h1>
        <p className="nm-muted mt-1 max-w-2xl">A quick reference for the nanoparticle candidates in this platform and the radiotherapy modalities they might pair with.</p>
      </div>

      <section className="nm-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink/5 px-5 py-4"><Sparkles size={16} className="text-sage-600" /><p className="nm-section-title">Candidate nanoparticle elements</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-sage-50 text-[11px] uppercase tracking-wide text-ink/50">
              <tr><th className="px-5 py-2.5">Element</th><th>Z</th><th>Bulk density</th><th>Development status</th></tr></thead>
            <tbody>{nps.map((n) => (
              <tr key={n.symbol} className="border-t border-ink/5">
                <td className="px-5 py-3 font-semibold text-ink">{n.name}</td><td className="font-mono">{n.z}</td>
                <td className="font-mono text-ink/60">{n.density} g/cm³</td><td><span className="nm-chip">{n.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {FACTS.map(([t, d]) => (<div key={t} className="nm-feature-card"><p className="font-display font-semibold text-sage-700">{t}</p><p className="mt-1 text-sm leading-relaxed text-ink/60">{d}</p></div>))}
      </section>

      <section>
        <p className="label-eyebrow mb-3">Radiotherapy modalities</p>
        <div className="grid gap-3 md:grid-cols-2">
          {MODALITIES.map(({ icon: Icon, name, text }) => (
            <div key={name} className="nm-card flex gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ribbon-50 text-ribbon-500"><Icon size={19} /></span>
              <div><p className="font-display font-semibold text-ink">{name}</p><p className="mt-1 text-sm leading-relaxed text-ink/60">{text}</p></div>
            </div>))}
        </div>
      </section>

      <section className="nm-card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div><p className="font-display font-semibold text-ink">Ready to quantify it?</p><p className="nm-muted">Pick a tumour site and nanoparticle in the Tumor Dose Lab.</p></div>
        <Link to="/dashboard/oncology/dose-lab" className="btn-primary"><Crosshair size={16} /> Open Dose Lab</Link>
      </section>
    </div>
  );
}
