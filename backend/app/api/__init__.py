# backend/app/api/__init__.py

from fastapi import APIRouter

router = APIRouter()

from . import tasks, dependencies, suggestions

router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
router.include_router(dependencies.router, prefix="/dependencies", tags=["dependencies"])
router.include_router(suggestions.router, prefix="/suggestions", tags=["suggestions"])