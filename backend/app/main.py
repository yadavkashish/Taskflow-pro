from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import config  # Load backend/.env before routers/services read configuration.
from app.api import analysis, tasks, dependencies, schedule, suggestions
from app.database import Base, engine

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

# Include API routers
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(dependencies.router, prefix="/dependencies", tags=["dependencies"])
app.include_router(suggestions.router, prefix="/suggestions", tags=["suggestions"])
app.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])

@app.get("/")
async def root():
    return {"message": "Welcome to TaskFlow Pro API"}
