from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.report import ReportCreateRequest, ReportOut
from app.models.user import UserOut

router = APIRouter(prefix="/api/reports", tags=["Reports"])

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

STYLES = getSampleStyleSheet()
INK = colors.HexColor("#0B1F3A")
BEAM = colors.HexColor("#00C2FF")
SIGNAL = colors.HexColor("#10B981")

TITLE_STYLE = ParagraphStyle("NanoMedTitle", parent=STYLES["Title"], textColor=INK, fontSize=22)
H2_STYLE = ParagraphStyle("NanoMedH2", parent=STYLES["Heading2"], textColor=INK, spaceBefore=14)
BODY_STYLE = ParagraphStyle("NanoMedBody", parent=STYLES["Normal"], leading=16)


def _build_pdf(path: Path, *, title: str, experiment: dict | None, simulation: dict | None):
    doc = SimpleDocTemplate(str(path), pagesize=letter, topMargin=0.9 * inch, bottomMargin=0.8 * inch)
    story = [
        Paragraph("NanoMed AI — Gamma-Ray Interaction Research Report", TITLE_STYLE),
        Spacer(1, 4),
        Paragraph(
            f"Generated {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}",
            ParagraphStyle("sub", parent=BODY_STYLE, textColor=colors.grey, fontSize=9),
        ),
        Spacer(1, 18),
        Paragraph(title, H2_STYLE),
    ]

    source = experiment or simulation
    if source:
        rows = [["Parameter", "Value"]]
        field_map = [
            ("Material", source.get("material_name")),
            ("Detector", source.get("detector")),
            ("Gamma Source", source.get("gamma_source", "—")),
            ("Energy (keV)", source.get("energy_kev")),
            ("Thickness (cm)", source.get("thickness_cm")),
            ("Initial Counts", source.get("initial_counts")),
            ("Final Counts", round(source.get("final_counts", 0), 1) if source.get("final_counts") else "—"),
            ("Absorption (%)", round(source.get("absorption_percent", 0), 3) if source.get("absorption_percent") else "—"),
            ("Linear Attenuation Coeff. (1/cm)", round(source.get("linear_attenuation_coeff", 0), 5) if source.get("linear_attenuation_coeff") else "—"),
        ]
        for label, value in field_map:
            rows.append([label, str(value)])

        table = Table(rows, colWidths=[2.6 * inch, 3.4 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), INK),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 16))

    story.append(Paragraph("Physics Summary", H2_STYLE))
    story.append(
        Paragraph(
            "Attenuation calculated via the Beer-Lambert law, "
            "I = I0 * exp(-mu * x), using a two-term semi-empirical "
            "photoelectric + Klein-Nishina Compton mass-attenuation model.",
            BODY_STYLE,
        )
    )

    if source and source.get("ai_explanation"):
        story.append(Paragraph("AI Scientific Explanation", H2_STYLE))
        story.append(Paragraph(source["ai_explanation"], BODY_STYLE))

    if simulation and simulation.get("ai_recommendation", {}).get("top_alternative_materials"):
        story.append(Paragraph("AI-Recommended Alternative Materials", H2_STYLE))
        alt_rows = [["Material", "Score", "Recommended Thickness (cm)"]]
        for alt in simulation["ai_recommendation"]["top_alternative_materials"]:
            alt_rows.append([alt["material_name"], f"{alt['score']}", f"{alt['recommended_thickness_cm']}"])
        alt_table = Table(alt_rows, colWidths=[3.0 * inch, 1.2 * inch, 1.8 * inch])
        alt_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), SIGNAL),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ]
            )
        )
        story.append(alt_table)

    story.append(Spacer(1, 24))
    story.append(
        Paragraph(
            "NanoMed AI — Intelligent Gamma-Ray Interaction Analysis & AI-Based "
            "Nanomaterial Recommendation Platform for Cancer Radiation Therapy Research.",
            ParagraphStyle("footer", parent=BODY_STYLE, fontSize=8, textColor=colors.grey),
        )
    )

    doc.build(story)


@router.get("", response_model=list[ReportOut])
async def list_reports(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("reports", {"owner_id": current_user.id})
    return [{**d, "id": d["_id"]} for d in docs]


@router.post("", response_model=ReportOut)
async def generate_report(payload: ReportCreateRequest, current_user: UserOut = Depends(get_current_user)):
    experiment = None
    if payload.experiment_id:
        experiment = await repository.find_one("experiments", {"_id": payload.experiment_id, "owner_id": current_user.id})
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

    title = payload.title or (
        f"Experiment Report — {experiment['experiment_name']}" if experiment else "Sim Lab Snapshot Report"
    )

    report_id = f"rpt-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    file_path = REPORTS_DIR / f"{report_id}.pdf"
    _build_pdf(file_path, title=title, experiment=experiment, simulation=payload.simulation_snapshot)

    doc = {
        "_id": report_id,
        "title": title,
        "experiment_id": payload.experiment_id,
        "owner_id": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "file_path": str(file_path),
    }
    await repository.insert_one("reports", doc)
    return {**doc, "id": doc["_id"]}


@router.get("/{report_id}/download")
async def download_report(report_id: str, current_user: UserOut = Depends(get_current_user)):
    doc = await repository.find_one("reports", {"_id": report_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(doc["file_path"], media_type="application/pdf", filename=f"{doc['title']}.pdf")
