from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import config  # Load backend/.env before routers/services read configuration.
from app.api import analysis, project, tasks, dependencies, schedule, suggestions
from app.database import Base, engine, migrate_project_schema, migrate_task_schedule_schema

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to restrict origins in production
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
