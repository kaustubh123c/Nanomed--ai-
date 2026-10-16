"""Oncology module: cancer-site reference data, nanoparticle dose-enhancement
screening and linear-quadratic (LQ) fractionation maths.

Everything here is an educational / research-screening aid built on the
platform's own photon-interaction model. It is NOT a clinical treatment
planning system and must not be used to make patient-care decisions.
"""
import math
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.user import UserOut

router = APIRouter(prefix="/api/oncology", tags=["Oncology"])

DISCLAIMER = (
    "Research and education tool only. Values are screening estimates from NIST mass-energy-absorption "
    "data and typical literature figures - not clinical advice."
)

# ---------------------------------------------------------------- reference data
CANCER_TYPES = [
    {"id": "breast", "name": "Breast cancer", "site": "Breast", "icon": "ribbon", "alpha_beta": 4.0,
     "modalities": ["EBRT", "Partial-breast / IORT", "Brachytherapy"],
     "typical_dose_gy": 50.0, "typical_fractions": 25, "depth_cm": 3.0,
     "summary": "Adjuvant whole-breast radiotherapy after breast-conserving surgery lowers local recurrence; a boost is added for higher-risk cases.",
     "regimens": ["50 Gy / 25 fx (conventional)", "40 Gy / 15 fx (hypofractionated)", "26 Gy / 5 fx (FAST-Forward)"],
     "np_strategies": ["Gold nanoparticles with kV/orthovoltage boost", "Gadolinium-based theranostics (MRI guided)"]},
    {"id": "prostate", "name": "Prostate cancer", "site": "Prostate", "icon": "target", "alpha_beta": 1.5,
     "modalities": ["EBRT / IMRT", "SBRT", "LDR & HDR brachytherapy"],
     "typical_dose_gy": 78.0, "typical_fractions": 39, "depth_cm": 9.0,
     "summary": "Low alpha/beta ratio makes prostate tumours respond well to hypofractionation and high-dose-rate brachytherapy.",
     "regimens": ["78 Gy / 39 fx", "60 Gy / 20 fx (moderate hypofx)", "36.25 Gy / 5 fx (SBRT)"],
     "np_strategies": ["Gold seeds / nanoparticle fiducials", "Hafnium oxide radioenhancers (research)"]},
    {"id": "lung", "name": "Lung cancer (NSCLC)", "site": "Lung", "icon": "wind", "alpha_beta": 10.0,
     "modalities": ["SBRT", "Concurrent chemo-RT", "Proton therapy"],
     "typical_dose_gy": 60.0, "typical_fractions": 30, "depth_cm": 7.0,
     "summary": "Early-stage disease is treated with SBRT; locally advanced disease with chemoradiation. Motion management is critical.",
     "regimens": ["60-66 Gy / 30-33 fx + chemo", "54 Gy / 3 fx (SBRT, peripheral)", "50 Gy / 4 fx (SBRT)"],
     "np_strategies": ["Hafnium oxide (NBTXR3) radioenhancers", "Gold nanoparticle radiosensitisation"]},
    {"id": "head_neck", "name": "Head & neck cancer", "site": "Head and neck", "icon": "user", "alpha_beta": 10.0,
     "modalities": ["IMRT / VMAT", "Concurrent chemo-RT", "Proton therapy"],
     "typical_dose_gy": 70.0, "typical_fractions": 35, "depth_cm": 4.0,
     "summary": "Definitive chemoradiation preserves organ function; sparing salivary glands and the spinal cord drives plan design.",
     "regimens": ["70 Gy / 35 fx + cisplatin", "66 Gy / 33 fx", "60 Gy / 30 fx (post-operative)"],
     "np_strategies": ["Hafnium oxide intratumoural injection", "Gold nanoparticle + cisplatin synergy (research)"]},
    {"id": "brain", "name": "Glioblastoma / brain", "site": "Brain", "icon": "brain", "alpha_beta": 10.0,
     "modalities": ["EBRT + temozolomide", "SRS / SRT", "Proton therapy"],
     "typical_dose_gy": 60.0, "typical_fractions": 30, "depth_cm": 5.0,
     "summary": "Standard care is maximal safe resection then 60 Gy with temozolomide. Brain metastases are commonly treated with SRS.",
     "regimens": ["60 Gy / 30 fx + temozolomide", "40 Gy / 15 fx (older patients)", "SRS 15-24 Gy / 1 fx (metastases)"],
     "np_strategies": ["Gadolinium nanoparticles (AGuIX) with whole-brain RT", "Gold nanoparticles crossing a disrupted BBB"]},
    {"id": "cervix", "name": "Cervical cancer", "site": "Cervix", "icon": "flower", "alpha_beta": 10.0,
     "modalities": ["EBRT + cisplatin", "HDR brachytherapy (image-guided)"],
     "typical_dose_gy": 45.0, "typical_fractions": 25, "depth_cm": 8.0,
     "summary": "Pelvic EBRT with concurrent cisplatin followed by an image-guided brachytherapy boost to reach a total EQD2 of 80-90 Gy at the cervix.",
     "regimens": ["45-50.4 Gy / 25-28 fx EBRT", "+ HDR 7 Gy x 4 fx (brachytherapy)"],
     "np_strategies": ["Gadolinium nanoparticles (AGuIX) - phase I/II", "Gold nanoparticle brachytherapy enhancement"]},
    {"id": "rectal", "name": "Rectal cancer", "site": "Rectum", "icon": "activity", "alpha_beta": 10.0,
     "modalities": ["Short-course RT", "Long-course chemo-RT", "Total neoadjuvant therapy"],
     "typical_dose_gy": 50.4, "typical_fractions": 28, "depth_cm": 9.0,
     "summary": "Neoadjuvant radiotherapy shrinks tumours and lowers local recurrence before total mesorectal excision.",
     "regimens": ["25 Gy / 5 fx (short course)", "50.4 Gy / 28 fx + capecitabine"],
     "np_strategies": ["Hafnium oxide radioenhancers (soft-tissue indications)"]},
    {"id": "liver", "name": "Liver cancer (HCC)", "site": "Liver", "icon": "droplet", "alpha_beta": 10.0,
     "modalities": ["SBRT", "Y-90 radioembolisation", "Proton therapy"],
     "typical_dose_gy": 45.0, "typical_fractions": 5, "depth_cm": 8.0,
     "summary": "SBRT and radioembolisation are options when surgery or ablation are not suitable; liver tolerance limits dose.",
     "regimens": ["40-50 Gy / 3-5 fx (SBRT)", "Y-90 radioembolisation"],
     "np_strategies": ["Gold nanoparticles with image-guided SBRT", "Bismuth-based high-Z agents (research)"]},
    {"id": "sarcoma", "name": "Soft-tissue sarcoma", "site": "Soft tissue", "icon": "layers", "alpha_beta": 10.0,
     "modalities": ["Pre-operative RT", "IMRT"],
     "typical_dose_gy": 50.0, "typical_fractions": 25, "depth_cm": 4.0,
     "summary": "Pre-operative radiotherapy is standard for extremity/trunk sarcoma. Hafnium oxide nanoparticles (NBTXR3) are the first radioenhancer approved in the EU for this indication.",
     "regimens": ["50 Gy / 25 fx pre-operative", "+ NBTXR3 intratumoural (EU approval)"],
     "np_strategies": ["NBTXR3 hafnium oxide (CE-marked, EU)"]},
    {"id": "skin", "name": "Skin cancer", "site": "Skin", "icon": "sun", "alpha_beta": 10.0,
     "modalities": ["Superficial / orthovoltage X-rays", "Electron beam", "Brachytherapy"],
     "typical_dose_gy": 50.0, "typical_fractions": 20, "depth_cm": 0.5,
     "summary": "Superficial kV beams are ideal for basal and squamous cell carcinomas and are the energy range where high-Z nanoparticles help most.",
     "regimens": ["50 Gy / 20 fx", "35 Gy / 5 fx"],
     "np_strategies": ["Gold nanoparticles with kV X-rays (strong photoelectric advantage)"]},
]

# element data: symbol -> (Z, A, bulk density g/cm3, label, status)
NANOPARTICLES = {
    "Au": (79, 196.97, 19.3, "Gold (Au)", "Preclinical / early clinical"),
    "Gd": (64, 157.25, 7.9, "Gadolinium (Gd)", "Phase I-II (AGuIX)"),
    "Hf": (72, 178.49, 13.3, "Hafnium (Hf)", "Approved in EU (NBTXR3, sarcoma)"),
    "Pt": (78, 195.08, 21.5, "Platinum (Pt)", "Preclinical"),
    "Bi": (83, 208.98, 9.8, "Bismuth (Bi)", "Preclinical"),
    "Ag": (47, 107.87, 10.5, "Silver (Ag)", "Preclinical"),
    "I": (53, 126.90, 4.9, "Iodine (I)", "Clinical contrast agent"),
    "Fe": (26, 55.85, 7.9, "Iron (Fe)", "Preclinical / MRI agent"),
}
# ---- NIST X-ray mass attenuation data (physics.nist.gov/PhysRefData/XrayMassCoef) ----
# Photon energies in MeV; values in cm^2/g.  mu_en/rho drives local energy deposition,
# mu/rho drives beam attenuation through tissue.
_E_MEV = [0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5,
          0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0, 20.0]
_MUEN = {
    "water": [4.944, 1.374, 0.5503, 0.1557, 0.06947, 0.04223, 0.0319, 0.02597, 0.02546, 0.02764, 0.02967,
              0.03192, 0.03279, 0.03299, 0.03284, 0.03206, 0.03103, 0.02965, 0.02833, 0.02608, 0.02281,
              0.02066, 0.01915, 0.01806, 0.01658, 0.01566, 0.01441, 0.01382],
    "Au": [112.6, 129.4, 65.22, 23.49, 11.09, 6.124, 3.751, 1.720, 2.074, 1.026, 0.5563, 0.2289, 0.1274,
           0.08523, 0.06409, 0.04427, 0.03525, 0.02915, 0.02593, 0.02333, 0.02302, 0.02432, 0.02582,
           0.02725, 0.02968, 0.03159, 0.0345, 0.03565],
    "Gd": [241.6, 85.38, 39.94, 13.33, 6.033, 3.242, 4.722, 2.937, 1.849, 0.7197, 0.3584, 0.1409, 0.08039,
           0.0565, 0.04483, 0.03399, 0.02893, 0.0253, 0.02325, 0.02144, 0.02129, 0.02241, 0.02374,
           0.02502, 0.02725, 0.02902, 0.03188, 0.03306],
    "Hf": [197.5, 111.1, 53.53, 18.51, 8.542, 4.651, 2.820, 2.958, 2.075, 0.8973, 0.4645, 0.1853, 0.1035,
           0.07044, 0.05409, 0.03886, 0.03188, 0.02708, 0.02447, 0.0223, 0.02212, 0.02338, 0.02483,
           0.0262, 0.02855, 0.0304, 0.0333, 0.03445],
    "Pt": [107.8, 126.5, 63.33, 22.68, 10.67, 5.879, 3.595, 2.592, 2.081, 1.006, 0.5413, 0.2216, 0.1233,
           0.08265, 0.0623, 0.04325, 0.03459, 0.02871, 0.0256, 0.02307, 0.02279, 0.02408, 0.02557,
           0.02699, 0.02939, 0.03127, 0.03418, 0.03529],
    "Bi": [129.8, 93.58, 70.6, 26.17, 12.55, 7.004, 4.32, 1.999, 1.951, 1.071, 0.6014, 0.2532, 0.1414,
           0.09411, 0.07017, 0.04758, 0.0373, 0.03039, 0.02678, 0.02389, 0.02347, 0.02475, 0.02626,
           0.02772, 0.0302, 0.03213, 0.03514, 0.03632],
    "Ag": [114.9, 37.8, 16.95, 16.6, 9.869, 6.066, 3.938, 1.907, 1.062, 0.3622, 0.1751, 0.07392, 0.04803,
           0.03822, 0.03347, 0.02881, 0.02632, 0.02425, 0.02284, 0.02135, 0.02082, 0.02142, 0.02232,
           0.02324, 0.02499, 0.02647, 0.02889, 0.03005],
    "I": [154.8, 52.08, 23.63, 7.622, 9.616, 6.573, 4.518, 2.331, 1.342, 0.4742, 0.2295, 0.09257, 0.0565,
          0.04267, 0.03598, 0.02962, 0.02646, 0.02399, 0.02243, 0.02092, 0.02059, 0.02142, 0.0225,
          0.02357, 0.02553, 0.02714, 0.0298, 0.03101],
    "Fe": [136.9, 48.96, 22.6, 7.251, 3.155, 1.638, 0.9555, 0.4104, 0.2177, 0.07961, 0.04825, 0.03361,
           0.03039, 0.02914, 0.02836, 0.02714, 0.02603, 0.02472, 0.0236, 0.02199, 0.02042, 0.0199,
           0.01983, 0.01997, 0.0205, 0.02108, 0.02221, 0.02292],
}
_MU_WATER = [5.329, 1.673, 0.8096, 0.3756, 0.2683, 0.2269, 0.2059, 0.1837, 0.1707, 0.1505, 0.137, 0.1186,
             0.1061, 0.09687, 0.08956, 0.07865, 0.07072, 0.06323, 0.05754, 0.04942, 0.03969, 0.03403,
             0.03031, 0.0277, 0.02429, 0.02219, 0.01941, 0.01813]
ENERGIES_KEV = [20, 30, 40, 50, 60, 80, 100, 150, 250, 500, 1000, 2000, 6000]


def _interp(table: list, e_kev: float) -> float:
    """Log-log interpolation of a NIST table (clamped to 10 keV - 20 MeV)."""
    e = min(max(e_kev / 1000.0, _E_MEV[0]), _E_MEV[-1])
    for i in range(len(_E_MEV) - 1):
        if _E_MEV[i] <= e <= _E_MEV[i + 1]:
            x0, x1 = math.log(_E_MEV[i]), math.log(_E_MEV[i + 1])
            y0, y1 = math.log(table[i]), math.log(table[i + 1])
            return math.exp(y0 + (y1 - y0) * (math.log(e) - x0) / (x1 - x0))
    return table[-1]


def _mu_rho_tissue(e: float) -> float:
    return _interp(_MU_WATER, e)


def _def(symbol: str, mg_per_g: float, e: float) -> float:
    """Dose enhancement factor (local energy-deposition upper bound).

    DEF = 1 + w * (muen_NP / muen_tissue - 1), w = NP mass fraction of the tumour.
    Ignores secondary-electron escape and microscale (nanometre) dose structure,
    so it is a first-order screening number, not a transport simulation.
    """
    w = max(min(mg_per_g / 1000.0, 0.5), 0.0)
    ratio = _interp(_MUEN[symbol], e) / _interp(_MUEN["water"], e)
    return 1.0 + w * (ratio - 1.0)


def _lq_bed(total: float, fractions: int, ab: float) -> float:
    d = total / fractions
    return total * (1 + d / ab)


def _eqd2(total: float, fractions: int, ab: float) -> float:
    return _lq_bed(total, fractions, ab) / (1 + 2 / ab)


# ---------------------------------------------------------------- schemas
class DoseRequest(BaseModel):
    cancer_id: Optional[str] = None
    nanoparticle: Literal["Au", "Gd", "Hf", "Pt", "Bi", "Ag", "I", "Fe"] = "Au"
    concentration_mg_per_g: float = Field(7.0, ge=0, le=100)
    energy_kev: float = Field(100.0, ge=10, le=20000)
    depth_cm: float = Field(3.0, ge=0, le=40)
    prescription_gy: float = Field(50.0, gt=0, le=200)
    fractions: int = Field(25, ge=1, le=60)
    alpha_beta: float = Field(10.0, gt=0, le=30)
    save: bool = False
    label: Optional[str] = None


# ---------------------------------------------------------------- endpoints
@router.get("/cancer-types")
async def cancer_types(_: UserOut = Depends(get_current_user)):
    return {"items": CANCER_TYPES, "disclaimer": DISCLAIMER}


@router.get("/nanoparticles")
async def nanoparticles(_: UserOut = Depends(get_current_user)):
    return {"items": [
        {"symbol": s, "name": v[3], "z": v[0], "atomic_mass": v[1], "density": v[2], "status": v[4]}
        for s, v in NANOPARTICLES.items()
    ]}


@router.post("/dose-enhancement")
async def dose_enhancement(payload: DoseRequest, current_user: UserOut = Depends(get_current_user)):
    try:
        e = payload.energy_kev
        mu_t = _mu_rho_tissue(e)  # cm2/g, tissue density ~1 g/cm3
        depth_transmission = math.exp(-mu_t * 1.0 * payload.depth_cm)
        # primary-photon fluence reaching the tumour depth reduces the physical dose delivered there
        def_at_depth = _def(payload.nanoparticle, payload.concentration_mg_per_g, e)

        ab = payload.alpha_beta
        n = payload.fractions
        base_bed = _lq_bed(payload.prescription_gy, n, ab)
        base_eqd2 = _eqd2(payload.prescription_gy, n, ab)
        boosted_gy = payload.prescription_gy * def_at_depth
        boosted_bed = _lq_bed(boosted_gy, n, ab)
        boosted_eqd2 = _eqd2(boosted_gy, n, ab)

        curve = [
            {"energy_kev": ek, "def": round(_def(payload.nanoparticle, payload.concentration_mg_per_g, ek), 4)}
            for ek in ENERGIES_KEV
        ]
        by_material = [
            {"symbol": s, "name": v[3],
             "def": round(_def(s, payload.concentration_mg_per_g, e), 4)}
            for s, v in NANOPARTICLES.items()
        ]
        by_material.sort(key=lambda r: -r["def"])
        depth_curve = [
            {"depth_cm": round(d, 1), "relative_fluence": round(math.exp(-mu_t * d), 4)}
            for d in [x * 0.5 for x in range(0, 41)]
        ]

        result = {
            "inputs": payload.model_dump(exclude={"save", "label"}),
            "dose_enhancement_factor": round(def_at_depth, 4),
            "enhancement_percent": round((def_at_depth - 1) * 100, 2),
            "tissue_mass_attenuation_cm2_g": round(mu_t, 5),
            "relative_fluence_at_depth": round(depth_transmission, 4),
            "base": {"bed_gy": round(base_bed, 2), "eqd2_gy": round(base_eqd2, 2),
                     "dose_per_fraction_gy": round(payload.prescription_gy / n, 3)},
            "enhanced": {"effective_dose_gy": round(boosted_gy, 2), "bed_gy": round(boosted_bed, 2),
                         "eqd2_gy": round(boosted_eqd2, 2)},
            "energy_curve": curve,
            "material_comparison": by_material,
            "depth_curve": depth_curve,
            "disclaimer": DISCLAIMER,
        }
        if payload.save:
            doc = await repository.insert_one("oncology_plans", {
                "owner_id": current_user.id,
                "label": payload.label or f"{payload.nanoparticle} @ {e:g} keV",
                "cancer_id": payload.cancer_id,
                "result": result,
            })
            result["saved_id"] = doc["_id"]
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/plans")
async def list_plans(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("oncology_plans", {"owner_id": current_user.id})
    return [
        {"id": d["_id"], "label": d.get("label"), "cancer_id": d.get("cancer_id"),
         "inputs": d["result"]["inputs"], "dose_enhancement_factor": d["result"]["dose_enhancement_factor"],
         "enhanced_eqd2_gy": d["result"]["enhanced"]["eqd2_gy"]}
        for d in docs[::-1]
    ]


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(plan_id: str, current_user: UserOut = Depends(get_current_user)):
    ok = await repository.delete_one("oncology_plans", {"_id": plan_id, "owner_id": current_user.id})
    if not ok:
        raise HTTPException(status_code=404, detail="Plan not found")
