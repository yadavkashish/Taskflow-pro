import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import config  # Load backend/.env before routers/services read configuration.
from app.api import analysis, project, tasks, dependencies, schedule, suggestions
from app.database import Base, engine, migrate_project_schema, migrate_task_schedule_schema

app = FastAPI()


def get_cors_origins(frontend_origin: str | None = None) -> list[str]:
    """Return explicit browser origins; deployment values may be comma-separated."""
    configured_origins = frontend_origin if frontend_origin is not None else os.getenv("FRONTEND_ORIGIN", "")
    origins = [origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    migrate_task_schedule_schema()
    migrate_project_schema()


@app.get("/health")
def health():
    """Unauthenticated liveness endpoint that exposes no configuration."""
    return {"status": "ok"}

# Include API routers
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(dependencies.router, prefix="/dependencies", tags=["dependencies"])
app.include_router(suggestions.router, prefix="/suggestions", tags=["suggestions"])
app.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(project.router, prefix="/projects", tags=["projects"])

@app.get("/")
async def root():
    return {"message": "Welcome to TaskFlow Pro API"}
