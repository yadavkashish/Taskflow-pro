from fastapi import APIRouter, HTTPException, Depends, Response, status as http_status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate, Task as TaskSchema
from app.services.dag_engine import DAGEngine

router = APIRouter()


@router.get("/", response_model=list[TaskSchema])
def read_tasks(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).offset(skip).limit(limit).all()
    return tasks


@router.post("/", response_model=TaskSchema, status_code=http_status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    db_task = Task(**task.model_dump())

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task


@router.get("/{task_id}", response_model=TaskSchema)
def read_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return task


@router.put("/{task_id}", response_model=TaskSchema)
def update_task(
    task_id: int,
    task: TaskUpdate,
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()

    if db_task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    for key, value in task.model_dump(exclude_unset=True).items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)

    if {"start_date", "end_date", "duration"}.intersection(
        task.model_fields_set
    ):
        DAGEngine(db).propagate_dates(db_task)

    return db_task


@router.delete("/{task_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()

    if db_task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db.delete(db_task)
    db.commit()

    return Response(status_code=http_status.HTTP_204_NO_CONTENT)


@router.post("/{task_id}/move", response_model=TaskSchema)
def move_task(
    task_id: int,
    status: TaskStatus,
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()

    if db_task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db_task.status = status
    db.commit()
    db.refresh(db_task)

    return db_task
