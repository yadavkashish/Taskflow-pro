from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dependency import Dependency
from app.schemas.dependency import DependencyCreate, DependencyOut
from app.services.dag_engine import DAGEngine

router = APIRouter()


@router.post("/", response_model=DependencyOut, status_code=status.HTTP_201_CREATED)
def create_dependency(
    dependency: DependencyCreate,
    db: Session = Depends(get_db)
):
    dag_engine = DAGEngine(db)
    try:
        return dag_engine.add_dependency(
            dependency.predecessor_id, dependency.successor_id
        )
    except HTTPException as exc:
        messages = {
            "CYCLE_DETECTED": "Adding this dependency would create a cycle.",
            "DUPLICATE_DEPENDENCY": "This dependency already exists.",
        }
        if exc.detail in messages:
            return JSONResponse(
                status_code=exc.status_code,
                content={"error": exc.detail, "message": messages[exc.detail]},
            )
        raise


@router.delete("/{id}", response_model=DependencyOut)
def delete_dependency(
    id: int,
    db: Session = Depends(get_db)
):
    dependency = (
        db.query(Dependency)
        .filter(Dependency.id == id)
        .first()
    )

    if dependency is None:
        raise HTTPException(
            status_code=404,
            detail="Dependency not found."
        )

    db.delete(dependency)
    db.commit()

    return dependency


@router.get("/", response_model=list[DependencyOut])
def get_dependencies(
    db: Session = Depends(get_db)
):
    return db.query(Dependency).all()
