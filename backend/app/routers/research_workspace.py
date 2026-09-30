from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.research_workspace import (
    ChecklistUpdate, DataImportOut, ProjectCreate, ProjectOut, ProjectUpdate,
)
from app.models.user import UserOut

router = APIRouter(prefix="/api/research-workspace", tags=["Research Workspace"])


def now():
    return datetime.now(timezone.utc).isoformat()


def out(doc):
    return ProjectOut(
        id=doc["_id"], owner_id=doc["owner_id"], name=doc["name"],
        description=doc.get("description", ""), status=doc.get("status", "Draft"),
        material_id=doc.get("material_id"), material_name=doc.get("material_name"),
        energy_kev=doc.get("energy_kev"), progress=int(doc.get("progress", 0)),
        tags=doc.get("tags", []), created_at=doc["created_at"], updated_at=doc["updated_at"],
    )


@router.get("/projects", response_model=list[ProjectOut])
async def list_projects(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("research_projects", {"owner_id": current_user.id})
    docs.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
    return [out(d) for d in docs]


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, current_user: UserOut = Depends(get_current_user)):
    stamp = now()
    doc = {**payload.model_dump(), "owner_id": current_user.id, "progress": 0, "created_at": stamp, "updated_at": stamp}
    if payload.material_id:
        mat = await repository.find_one("materials", {"_id": payload.material_id, "owner_id": current_user.id})
        if mat:
            doc["material_name"] = mat.get("name")
    created = await repository.insert_one("research_projects", doc)
    return out(created)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, payload: ProjectUpdate, current_user: UserOut = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if payload.material_id:
        mat = await repository.find_one("materials", {"_id": payload.material_id, "owner_id": current_user.id})
        if mat:
            updates["material_name"] = mat.get("name")
    updates["updated_at"] = now()
    updated = await repository.update_one("research_projects", {"_id": project_id, "owner_id": current_user.id}, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return out(updated)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: UserOut = Depends(get_current_user)):
    if not await repository.delete_one("research_projects", {"_id": project_id, "owner_id": current_user.id}):
        raise HTTPException(status_code=404, detail="Project not found")


@router.get("/summary")
async def workspace_summary(current_user: UserOut = Depends(get_current_user)):
    projects = await repository.find("research_projects", {"owner_id": current_user.id})
    experiments = await repository.find("experiments", {"owner_id": current_user.id})
    materials = await repository.find("materials", {"owner_id": current_user.id})
    papers = await repository.find("research_papers", {"owner_id": current_user.id})
    files = await repository.find("research_files", {"owner_id": current_user.id})
    active = sum(1 for p in projects if p.get("status") == "Active")
    progress = round(sum(int(p.get("progress", 0)) for p in projects) / len(projects)) if projects else 0
    return {"projects": len(projects), "active_projects": active, "experiments": len(experiments), "materials": len(materials), "papers": len(papers), "files": len(files), "analysis_readiness": progress}


@router.get("/checklist")
async def get_checklist(current_user: UserOut = Depends(get_current_user)):
    doc = await repository.find_one("workspace_checklists", {"owner_id": current_user.id})
    return {"items": doc.get("items", []) if doc else [False] * 6}


@router.put("/checklist")
async def update_checklist(payload: ChecklistUpdate, current_user: UserOut = Depends(get_current_user)):
    doc = await repository.update_one("workspace_checklists", {"owner_id": current_user.id}, {"items": payload.items, "updated_at": now()})
    if not doc:
        doc = await repository.insert_one("workspace_checklists", {"owner_id": current_user.id, "items": payload.items, "updated_at": now()})
    return {"items": doc.get("items", [])}


@router.post("/import", response_model=DataImportOut, status_code=status.HTTP_201_CREATED)
async def import_data(file: UploadFile = File(...), project_id: Optional[str] = None, current_user: UserOut = Depends(get_current_user)):
    name = file.filename or "data"
    ext = name.lower().rsplit(".", 1)[-1] if "." in name else ""
    if ext not in {"csv", "xlsx", "xls"}:
        raise HTTPException(status_code=400, detail="Only CSV, XLSX and XLS files are supported")
    raw = await file.read()
    try:
        if ext == "csv":
            df = pd.read_csv(BytesIO(raw))
        else:
            df = pd.read_excel(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}")
    preview = df.head(10).where(pd.notnull(df), None).to_dict(orient="records")
    stamp = now()
    doc = {"owner_id": current_user.id, "filename": name, "rows": int(len(df)), "columns": int(len(df.columns)), "columns_list": [str(c) for c in df.columns], "preview": preview, "project_id": project_id, "created_at": stamp}
    created = await repository.insert_one("research_files", doc)
    return DataImportOut(id=created["_id"], filename=name, rows=created["rows"], columns=created["columns"], columns_list=created["columns_list"], preview=created["preview"], project_id=project_id, created_at=stamp)


@router.get("/files", response_model=list[DataImportOut])
async def list_imports(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("research_files", {"owner_id": current_user.id})
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return [DataImportOut(id=d["_id"], filename=d["filename"], rows=d["rows"], columns=d["columns"], columns_list=d["columns_list"], preview=d.get("preview", []), project_id=d.get("project_id"), created_at=d["created_at"]) for d in docs]


@router.get("/activity")
async def workspace_activity(current_user: UserOut = Depends(get_current_user)):
    """Return a compact cross-module activity feed for the research workspace."""
    items = []
    sources = [
        ("project", "research_projects", "updated_at", "Project"),
        ("experiment", "experiments", "created_at", "Experiment"),
        ("material", "materials", "created_at", "Material"),
        ("paper", "research_papers", "created_at", "Paper"),
        ("dataset", "research_files", "created_at", "Dataset"),
    ]
    for kind, collection, stamp_key, label in sources:
        for doc in await repository.find(collection, {"owner_id": current_user.id}):
            title = doc.get("name") or doc.get("title") or doc.get("filename") or f"{label} activity"
            items.append({"type": kind, "label": label, "title": title, "timestamp": doc.get(stamp_key) or doc.get("updated_at") or ""})
    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:12]


@router.get("/notifications")
async def workspace_notifications(current_user: UserOut = Depends(get_current_user)):
    """Generate lightweight, user-scoped research notifications from existing workspace data."""
    notifications = []
    projects = await repository.find("research_projects", {"owner_id": current_user.id})
    files = await repository.find("research_files", {"owner_id": current_user.id})
    for p in projects:
        progress = int(p.get("progress", 0))
        if p.get("status") == "Active" and progress >= 80:
            notifications.append({"type": "milestone", "title": "Project nearing completion", "message": f"{p.get('name','Project')} is {progress}% complete.", "severity": "info"})
        if p.get("status") == "Draft":
            notifications.append({"type": "setup", "title": "Draft project needs setup", "message": f"Add material, energy and milestones to {p.get('name','this project')}.", "severity": "attention"})
    if files:
        latest = sorted(files, key=lambda d: d.get("created_at", ""), reverse=True)[0]
        notifications.append({"type": "dataset", "title": "Latest dataset ready", "message": f"{latest.get('filename','Dataset')} contains {latest.get('rows',0)} rows across {latest.get('columns',0)} columns.", "severity": "success"})
    if not notifications:
        notifications.append({"type": "welcome", "title": "Research workspace ready", "message": "Create a project or import experimental readings to get started.", "severity": "info"})
    return notifications[:8]


@router.get("/projects/{project_id}/milestones")
async def get_milestones(project_id: str, current_user: UserOut = Depends(get_current_user)):
    project = await repository.find_one("research_projects", {"_id": project_id, "owner_id": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = await repository.find_one("research_milestones", {"owner_id": current_user.id, "project_id": project_id})
    return {"project_id": project_id, "items": doc.get("items", []) if doc else []}


@router.put("/projects/{project_id}/milestones")
async def update_milestones(project_id: str, payload: dict, current_user: UserOut = Depends(get_current_user)):
    project = await repository.find_one("research_projects", {"_id": project_id, "owner_id": current_user.id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    items = payload.get("items", [])
    if not isinstance(items, list) or len(items) > 20:
        raise HTTPException(status_code=400, detail="Milestones must be a list of up to 20 items")
    cleaned = []
    for item in items:
        if not isinstance(item, dict) or not str(item.get("title", "")).strip():
            continue
        cleaned.append({"title": str(item["title"])[:200], "done": bool(item.get("done", False))})
    doc = await repository.update_one("research_milestones", {"owner_id": current_user.id, "project_id": project_id}, {"items": cleaned, "updated_at": now()})
    if not doc:
        doc = await repository.insert_one("research_milestones", {"owner_id": current_user.id, "project_id": project_id, "items": cleaned, "updated_at": now()})
    return {"project_id": project_id, "items": doc.get("items", [])}


@router.get("/files/{file_id}/quality")
async def data_quality(file_id: str, current_user: UserOut = Depends(get_current_user)):
    """Calculate quality indicators from the stored dataset preview and metadata."""
    doc = await repository.find_one("research_files", {"_id": file_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found")
    preview = doc.get("preview", [])
    cols = doc.get("columns_list", [])
    missing = {c: sum(1 for row in preview if row.get(c) in (None, "")) for c in cols}
    numeric = []
    for c in cols:
        vals = []
        for row in preview:
            try:
                if row.get(c) not in (None, ""):
                    vals.append(float(row[c]))
            except (TypeError, ValueError):
                pass
        if vals:
            numeric.append({"column": c, "min": min(vals), "max": max(vals), "mean": round(sum(vals)/len(vals), 6)})
    missing_cells = sum(missing.values())
    preview_cells = max(1, len(preview) * max(1, len(cols)))
    completeness = round(100 * (1 - missing_cells / preview_cells), 1)
    return {"file_id": file_id, "rows": doc.get("rows", 0), "columns": len(cols), "preview_rows": len(preview), "completeness_preview_pct": max(0, completeness), "missing_by_column": missing, "numeric_summary": numeric, "note": "Quality metrics are calculated from the stored preview (up to 10 rows), not the full original file."}
