from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.critical_path import calculate_critical_path


router = APIRouter()


@router.get("/critical-path")
def read_critical_path(db: Session = Depends(get_db)):
    return calculate_critical_path(db)
