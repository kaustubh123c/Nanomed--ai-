from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin,
    analytics,
    auth,
    calculators,
    chatbot,
    dashboard,
    experiments,
    materials,
    papers,
    physics_advanced,
    planner,
    reports,
    simlab,
    research_workspace,
    research_studio,
    frontend_core,
)

app = FastAPI(
    title="NanoMed AI API",
    description="Intelligent Gamma-Ray Interaction Analysis & Nanomaterial "
    "Recommendation Platform for Cancer Radiation Therapy Research",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(materials.router)
app.include_router(experiments.router)
app.include_router(simlab.router)
app.include_router(research_workspace.router)
app.include_router(research_studio.router)
app.include_router(frontend_core.router)
app.include_router(calculators.router)
app.include_router(physics_advanced.router)
app.include_router(planner.router)
app.include_router(papers.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(chatbot.router)


@app.get("/api/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "nanomed-ai-backend"}
