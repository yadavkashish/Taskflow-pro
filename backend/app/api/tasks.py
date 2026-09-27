from fastapi import APIRouter, HTTPException, Depends, Response, status as http_status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskReorder, TaskUpdate, Task as TaskSchema
from app.services.dag_engine import DAGEngine
from app.services.scheduling import recompute_schedule

router = APIRouter()


@router.get("/", response_model=list[TaskSchema])
def read_tasks(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).order_by(Task.status, Task.position, Task.id).offset(skip).limit(limit).all()
    return tasks


@router.post("/", response_model=TaskSchema, status_code=http_status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    task_data = task.model_dump()
    task_data["board_column"] = task_data["status"]
    if task_data["position"] is None:
        last_task = db.query(Task).filter(Task.status == task_data["status"]).order_by(Task.position.desc(), Task.id.desc()).first()
        task_data["position"] = (last_task.position + 1) if last_task and last_task.position is not None else 0
    planned_start_date = task_data.get("planned_start_date") or task_data.get("start_date")
    task_data["planned_start_date"] = planned_start_date
    task_data["start_date"] = None
    task_data["end_date"] = None
    db_task = Task(**task_data)

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    recompute_schedule(db)
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

    update_data = task.model_dump(exclude_unset=True)
    if "planned_start_date" in update_data:
        db_task.planned_start_date = update_data.pop("planned_start_date")
    elif "start_date" in update_data:
        db_task.planned_start_date = update_data["start_date"]
    update_data.pop("start_date", None)
    update_data.pop("end_date", None)
    for key, value in update_data.items():
        setattr(db_task, key, value)

    if "status" in task.model_fields_set:
        db_task.board_column = db_task.status.value if isinstance(db_task.status, TaskStatus) else db_task.status

    db.commit()
    db.refresh(db_task)

    schedule_fields = {"planned_start_date", "start_date", "end_date", "duration"}
    if schedule_fields.intersection(task.model_fields_set):
        recompute_schedule(db)
        db.refresh(db_task)

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
    recompute_schedule(db)

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

    source_status = db_task.status
    db_task.status = status
    db_task.board_column = status.value
    last_task = db.query(Task).filter(Task.status == status, Task.id != task_id).order_by(Task.position.desc(), Task.id.desc()).first()
    db_task.position = (last_task.position + 1) if last_task and last_task.position is not None else 0
    if source_status != status:
        source_tasks = db.query(Task).filter(Task.status == source_status).order_by(Task.position, Task.id).all()
        for position, source_task in enumerate(source_tasks):
            source_task.position = position
    db.commit()
    db.refresh(db_task)

    return db_task


@router.post("/{task_id}/reorder", response_model=TaskSchema)
def reorder_task(
    task_id: int,
    reorder: TaskReorder,
    db: Session = Depends(get_db),
):
    """Persist a complete, deterministic ordering for one workflow column."""
    moved_task = db.get(Task, task_id)
    if moved_task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    target_status = TaskStatus(reorder.status)
    source_status = moved_task.status
    target_tasks = db.query(Task).filter(Task.status == target_status, Task.id != task_id).all()
    expected_ids = {task.id for task in target_tasks} | {task_id}
    if len(reorder.ordered_task_ids) != len(expected_ids) or set(reorder.ordered_task_ids) != expected_ids:
        raise HTTPException(status_code=422, detail="ordered_task_ids must contain every task in the target column exactly once")

    moved_task.status = target_status
    moved_task.board_column = target_status.value
    by_id = {task.id: task for task in target_tasks}
    by_id[task_id] = moved_task
    for position, ordered_id in enumerate(reorder.ordered_task_ids):
        by_id[ordered_id].position = position

    if source_status != target_status:
        source_tasks = db.query(Task).filter(Task.status == source_status).order_by(Task.position, Task.id).all()
        for position, source_task in enumerate(source_tasks):
            source_task.position = position

    db.commit()
    db.refresh(moved_task)
    return moved_task
