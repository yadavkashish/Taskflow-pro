from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dependency import Dependency
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.dependency import Dependency
from app.schemas.task import Task as TaskSchema, TaskCreate, TaskUpdate, TaskReorder
from app.schemas.dependency import DependencyCreate, DependencyOut
from app.schemas.project import Project as ProjectSchema
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.dag_engine import DAGEngine
from app.services.scheduling import recompute_schedule
from app.services.critical_path import calculate_critical_path, calculate_critical_path_for_graph
from app.services.project_health import analyze_project_health
from app.services.impact_analysis import analyze_impact
from app.schemas.impact import ImpactAnalysisRequest, ImpactAnalysisResponse
from app.schemas.health import ProjectHealthResponse
from app.api.suggestions import SuggestionRequest, TaskForSuggestion, suggest_dependencies_for_tasks
from app.services.deadline_status import get_deadline_status

router = APIRouter()


def get_project_or_404(project_id: int, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def project_summary(project: Project, tasks: list[Task], edges: list[tuple[int, int]]) -> dict:
    task_by_id = {task.id: task for task in tasks}
    blocked = sum(
        any(task_by_id.get(predecessor_id) is None or task_by_id[predecessor_id].status != TaskStatus.DONE for predecessor_id, successor_id in edges if successor_id == task.id)
        for task in tasks
    )
    critical_path = calculate_critical_path_for_graph(tasks, edges)
    completed = sum(task.status == TaskStatus.DONE for task in tasks)
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "created_at": project.created_at, "updated_at": project.updated_at,
        "task_count": len(tasks),
        "in_progress_count": sum(task.status == TaskStatus.IN_PROGRESS for task in tasks),
        "blocked_count": blocked,
        "completed_count": completed,
        "critical_path_duration": critical_path["total_duration"] if critical_path["is_complete"] and critical_path["task_ids"] else None,
    }


@router.get("/", response_model=list[dict])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc(), Project.id.desc()).all()
    all_tasks = db.query(Task).order_by(Task.id).all()
    tasks_by_project: dict[int, list[Task]] = {project.id: [] for project in projects}
    task_project = {task.id: task.project_id for task in all_tasks}
    for task in all_tasks:
        if task.project_id in tasks_by_project:
            tasks_by_project[task.project_id].append(task)
    edges_by_project: dict[int, list[tuple[int, int]]] = {project.id: [] for project in projects}
    for edge in db.query(Dependency).order_by(Dependency.predecessor_id, Dependency.successor_id):
        project_id = task_project.get(edge.predecessor_id)
        if project_id is not None and project_id == task_project.get(edge.successor_id) and project_id in edges_by_project:
            edges_by_project[project_id].append((edge.predecessor_id, edge.successor_id))
    return [project_summary(project, tasks_by_project[project.id], edges_by_project[project.id]) for project in projects]


@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=payload.name, description=payload.description, start_date=payload.start_date, target_deadline=payload.target_deadline)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
def get_project(project_id: int, db: Session = Depends(get_db)):
    return get_project_or_404(project_id, db)


@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = get_project_or_404(project_id, db)
    project.name = payload.name
    project.description = payload.description
    project.start_date = payload.start_date
    project.target_deadline = payload.target_deadline
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = get_project_or_404(project_id, db)
    task_ids = [task_id for (task_id,) in db.query(Task.id).filter(Task.project_id == project_id)]
    try:
        if task_ids:
            db.query(Dependency).filter((Dependency.predecessor_id.in_(task_ids)) | (Dependency.successor_id.in_(task_ids))).delete(synchronize_session=False)
            db.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
        db.delete(project)
        db.commit()
    except Exception:
        db.rollback()
        raise


@router.get("/{project_id}/tasks", response_model=list[TaskSchema])
def list_tasks(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    return db.query(Task).filter(Task.project_id == project_id).order_by(Task.status, Task.position, Task.id).all()


@router.post("/{project_id}/tasks", response_model=TaskSchema, status_code=201)
def create_task(project_id: int, payload: TaskCreate, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    data = payload.model_dump()
    data["project_id"] = project_id
    data["board_column"] = data["status"]
    if data["position"] is None:
        last = db.query(Task).filter(Task.project_id == project_id, Task.status == data["status"]).order_by(Task.position.desc(), Task.id.desc()).first()
        data["position"] = (last.position + 1) if last and last.position is not None else 0
    data["planned_start_date"] = data.get("planned_start_date") or data.get("start_date")
    data["start_date"] = data["end_date"] = None
    task = Task(**data)
    db.add(task); db.commit(); recompute_schedule(db, project_id); db.refresh(task)
    return task


def _task(project_id: int, task_id: int, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if task is None: raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{project_id}/tasks/{task_id}", response_model=TaskSchema)
def update_task(project_id: int, task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _task(project_id, task_id, db); data = payload.model_dump(exclude_unset=True)
    if "planned_start_date" in data: task.planned_start_date = data.pop("planned_start_date")
    elif "start_date" in data: task.planned_start_date = data["start_date"]
    data.pop("start_date", None); data.pop("end_date", None)
    for key, value in data.items(): setattr(task, key, value)
    if "status" in payload.model_fields_set: task.board_column = task.status.value if isinstance(task.status, TaskStatus) else task.status
    db.commit()
    if {"planned_start_date", "start_date", "end_date", "duration"}.intersection(payload.model_fields_set): recompute_schedule(db, project_id)
    db.refresh(task); return task


@router.delete("/{project_id}/tasks/{task_id}", status_code=204)
def delete_task(project_id: int, task_id: int, db: Session = Depends(get_db)):
    task = _task(project_id, task_id, db)
    db.query(Dependency).filter((Dependency.predecessor_id == task.id) | (Dependency.successor_id == task.id)).delete(synchronize_session=False)
    db.delete(task); db.commit(); recompute_schedule(db, project_id)


@router.post("/{project_id}/tasks/{task_id}/move", response_model=TaskSchema)
def move_task(project_id: int, task_id: int, status: TaskStatus, db: Session = Depends(get_db)):
    task = _task(project_id, task_id, db); source = task.status; task.status = status; task.board_column = status.value
    last = db.query(Task).filter(Task.project_id == project_id, Task.status == status, Task.id != task_id).order_by(Task.position.desc(), Task.id.desc()).first()
    task.position = (last.position + 1) if last and last.position is not None else 0
    for position, sibling in enumerate(db.query(Task).filter(Task.project_id == project_id, Task.status == source, Task.id != task_id).order_by(Task.position, Task.id)): sibling.position = position
    db.commit(); db.refresh(task); return task


@router.post("/{project_id}/tasks/{task_id}/reorder", response_model=TaskSchema)
def reorder_task(project_id: int, task_id: int, payload: TaskReorder, db: Session = Depends(get_db)):
    task = _task(project_id, task_id, db); target = TaskStatus(payload.status)
    siblings = db.query(Task).filter(Task.project_id == project_id, Task.status == target, Task.id != task_id).all()
    expected = {item.id for item in siblings} | {task_id}
    if set(payload.ordered_task_ids) != expected or len(payload.ordered_task_ids) != len(expected):
        raise HTTPException(status_code=422, detail="ordered_task_ids must contain every task in the target column exactly once")
    source = task.status; task.status = target; task.board_column = target.value
    by_id = {item.id: item for item in siblings}; by_id[task_id] = task
    for position, ordered_id in enumerate(payload.ordered_task_ids): by_id[ordered_id].position = position
    if source != target:
        for position, sibling in enumerate(db.query(Task).filter(Task.project_id == project_id, Task.status == source, Task.id != task_id).order_by(Task.position, Task.id)): sibling.position = position
    db.commit(); db.refresh(task); return task


@router.get("/{project_id}/dependencies", response_model=list[DependencyOut])
def list_dependencies(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    return db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id).filter(Task.project_id == project_id).all()


@router.post("/{project_id}/dependencies", response_model=DependencyOut, status_code=201)
def create_dependency(project_id: int, payload: DependencyCreate, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    return DAGEngine(db, project_id).add_dependency(payload.predecessor_id, payload.successor_id)


@router.delete("/{project_id}/dependencies/{dependency_id}", status_code=204)
def delete_dependency(project_id: int, dependency_id: int, db: Session = Depends(get_db)):
    edge = db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id).filter(Dependency.id == dependency_id, Task.project_id == project_id).first()
    if edge is None: raise HTTPException(status_code=404, detail="Dependency not found")
    db.delete(edge); db.commit(); recompute_schedule(db, project_id)


@router.get("/{project_id}/schedule/critical-path")
def critical_path(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db); return calculate_critical_path(db, project_id)

@router.get("/{project_id}/schedule/deadline-status")
def deadline_status(project_id: int, db: Session = Depends(get_db)):
    return get_deadline_status(db, get_project_or_404(project_id, db))


@router.get("/{project_id}/analysis/project-health", response_model=ProjectHealthResponse)
def project_health(project_id: int, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db); return analyze_project_health(db, project_id)


@router.post("/{project_id}/analysis/impact", response_model=ImpactAnalysisResponse)
def impact(project_id: int, payload: ImpactAnalysisRequest, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db); return analyze_impact(db, payload.task_id, payload.changes, project_id)


@router.post("/{project_id}/suggestions/suggest-dependencies")
async def suggest_project_dependencies(project_id: int, payload: SuggestionRequest, db: Session = Depends(get_db)):
    get_project_or_404(project_id, db)
    requested_ids = {task.id for task in payload.tasks}
    owned_tasks = db.query(Task).filter(Task.project_id == project_id, Task.id.in_(requested_ids)).order_by(Task.id).all()
    owned_ids = {task.id for task in owned_tasks}
    if requested_ids != owned_ids:
        raise HTTPException(status_code=422, detail="Suggestions can only include tasks from the selected project")
    scoped_payload = SuggestionRequest(tasks=[TaskForSuggestion(id=task.id, title=task.title, description=task.description) for task in owned_tasks])
    existing_edges = [
        (edge.predecessor_id, edge.successor_id)
        for edge in db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id).filter(Task.project_id == project_id)
    ]
    return await suggest_dependencies_for_tasks(scoped_payload, owned_ids, existing_edges)
