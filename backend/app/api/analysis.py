from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.impact import ImpactAnalysisRequest, ImpactAnalysisResponse
from app.services.impact_analysis import analyze_impact

router = APIRouter()


@router.post("/impact", response_model=ImpactAnalysisResponse)
def preview_impact(payload: ImpactAnalysisRequest, db: Session = Depends(get_db)):
    return analyze_impact(db, payload.task_id, payload.changes)
