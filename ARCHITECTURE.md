# TaskFlow Pro Architecture

## Overview

TaskFlow Pro is a multi-project task-management application built around a
deterministic dependency DAG. Each project owns an isolated task graph. The
backend remains authoritative for dependency validation, derived scheduling,
Critical Path, deadline status, health findings, and impact previews.

## Components

### Frontend

The React, TypeScript, Vite, and Tailwind frontend uses project-scoped routes:

```text
/projects/:projectId/overview
/projects/:projectId/board
/projects/:projectId/dependencies
/projects/:projectId/schedule
/projects/:projectId/calendar
/projects/:projectId/critical-path
```

`ProjectContext` owns the selected project. `TaskFlowContext` uses the
project ID to load project-scoped tasks, dependencies, Critical Path, and
health data. Relevant components include the Kanban board, dependency
management/map, schedule view, Calendar, Critical Path view, Project Health,
task modal, and AI dependency assistant.

The frontend refreshes this shared project state after normal task or
dependency mutations. It does not contain a second scheduling engine.

### Backend

FastAPI project-scoped endpoints use SQLAlchemy sessions and Pydantic schemas.
The main application services are:

- `DAGEngine`: ownership checks, duplicate/self/cycle rejection, and derived
  READY/BLOCKED state.
- `scheduling`: full graph schedule recomputation from predecessor completion
  and explicit planned-start constraints.
- `critical_path`: deterministic longest-path analysis.
- `deadline_status`: target-deadline versus calculated-completion status.
- `project_health`: deterministic risk/findings analysis.
- `impact_analysis`: read-only schedule and Critical Path preview.
- `llm_service`: bounded, advisory provider integration for dependency
  suggestions.

### Persistence model

- **Project**: name, description, start date, target deadline, and timestamps.
- **Task**: owning `project_id`, workflow status, duration, board position,
  planned start constraint, and derived schedule dates.
- **Dependency**: predecessor-to-successor task edge.

SQLite is the default local `DATABASE_URL` database. The repository uses
SQLAlchemy and does not claim production-scale database support.

## Data Flow

1. A project-scoped page loads its project and shared task-flow state.
2. The frontend calls the corresponding project-scoped API.
3. The backend validates ownership and input through Pydantic and services.
4. A normal mutation persists through SQLAlchemy.
5. Dependency/schedule-affecting mutations invoke the deterministic schedule
   recomputation service.
6. The frontend refreshes shared state and renders the authoritative results.

## Dependency and Schedule Rules

An edge `A -> B` means A must complete before B is READY. A task's persisted
workflow status is limited to Backlog, In Progress, Review, or Done; READY and
BLOCKED are derived from prerequisite completion.

The graph must remain acyclic. The backend rejects cycles before persistence.
Schedule recomputation uses the latest predecessor completion constraint, so
converging paths do not double-count a common upstream delay.

## AI Suggestion Boundary

The selected project's task context is rebuilt server-side and sent to the
configured provider. The response is validated and filtered before display.
AI analysis is read-only: users explicitly accept or reject suggestions, and
accepted edges use the normal dependency endpoint and DAG validation.

See [AI_USAGE.md](AI_USAGE.md) and [TESTING.md](TESTING.md) for detailed
provider safety and verification evidence.
