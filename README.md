# TaskFlow Pro

TaskFlow Pro is a dependency-aware multi-project workflow and DAG scheduling
platform. It combines a persistent Kanban workspace with deterministic
dependency, schedule, risk, and delivery analysis.

## Overview

Each project has its own workspace, tasks, dependency graph, schedule, and
delivery signals. Teams manage work on a Kanban board, connect prerequisite
relationships, and use the deterministic DAG engine to derive readiness and
recompute schedule constraints. An optional AI assistant proposes dependency
edges for human review; it never changes the graph on its own.

## Core Features

- Multi-project dashboard and isolated project workspaces
- Task create, edit, delete, and status updates
- Backlog, In Progress, Review, and Done Kanban workflow
- Persistent drag-and-drop moves and same-column ordering
- Prerequisite dependency management and visual dependency map
- Derived READY/BLOCKED state independent of a task's workflow column
- Self, duplicate, direct, and indirect cycle rejection
- Dependency-aware schedule propagation
- Converging-DAG no-compounding behavior
- Rollback handling when a completed prerequisite becomes unfinished
- Deterministic Critical Path analysis
- Project Health findings and deadline tracking
- Read-only What-If Impact Analysis before task changes are applied
- Project Calendar visualizing schedules, milestones, deadlines, and task state
- AI-assisted dependency suggestions with human approval
- Optional idempotent demo project seed

## Architecture

### Frontend

React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and
`@dnd-kit/core` provide project-scoped pages, Kanban drag-and-drop, schedule
and Calendar views, dependency visualizations, and the AI suggestion review
flow.

### Backend

FastAPI exposes project-scoped APIs. SQLAlchemy models persist projects, tasks,
and dependency edges; Pydantic validates API data. Deterministic services own
DAG validation, schedule recomputation, Critical Path, health, deadlines, and
impact previews.

### Database

SQLite is the default local database through `DATABASE_URL`
(`sqlite:///./taskflow.db`). `DATABASE_URL` is passed to SQLAlchemy and may
be configured for another compatible database, but this repository only claims
local SQLite persistence and test coverage.

### AI providers

`AI_PROVIDER=groq` is the example/default configuration and Groq is the
provider used for the demonstrated dependency-assistant flow. The provider
boundary also supports configured Gemini and OpenAI clients; keys remain
server-side.

## DAG Engine

An edge `A -> B` means **A is a prerequisite of B**:

```text
Design schema -> Build API -> Integration tests
```

Dependencies must form a directed acyclic graph. The backend rejects cycles
before an edge is persisted. READY/BLOCKED is derived from predecessor
completion, not stored as a task workflow value:

- a task is READY when every prerequisite is Done;
- it is BLOCKED when any prerequisite is unfinished;
- its workflow status remains Backlog, In Progress, Review, or Done.

## No Compounding

Converging paths are recomputed from current predecessor completion dates:

```text
       A
      / \
     B   C
      \ /
       D
```

If A moves by +3 days, D moves according to the recalculated prerequisite
schedule once—not +6 days merely because two paths reach D. This behavior has
automated regression coverage for diamond/converging graphs.

## Rollback

Dependency state is recalculated after status changes:

```text
A = DONE
-> B may become READY

A moved back to IN PROGRESS
-> B becomes BLOCKED again when A is an unsatisfied prerequisite
```

Rollback behavior has automated regression coverage.

## Critical Path

The backend calculates a deterministic longest dependency chain using task
durations. Parallel branches are not summed. If equal-duration critical paths
exist, the service returns one deterministic representative path using stable
task-ID tie-breaking. Missing or invalid durations make weighted analysis
incomplete rather than guessed.

## Calendar

The project Calendar is a visualization layer, not a second scheduler. It
renders existing scheduler-generated task dates, project start and deadline
milestones, derived READY/BLOCKED state, Critical Path indicators, and
unscheduled tasks. It does not support drag-to-reschedule; schedule changes
continue through normal task editing and backend recomputation.

## Project Health and Deadlines

Project Health produces deterministic, explainable findings for blocked work,
critical blocked work, missing durations, and unscheduled tasks. Deadline
status compares the latest calculated project completion date with the
project's target deadline and reports on-track, at-risk, no-deadline, or
no-schedule states.

## AI Dependency Assistant

The runtime flow is deliberately human-in-the-loop:

```text
Selected project tasks
-> AI analysis
-> structured dependency suggestions (reason + confidence)
-> user Accept / Reject
-> normal dependency API
-> DAG validation
-> persistence
```

**AI does not directly create dependencies.**

The backend grounds analysis in the selected project's database records:
existing task IDs, titles, descriptions, and current dependency edges. It
rebuilds that input server-side and validates every result. Invented IDs,
cross-project IDs, self-links, existing edges, duplicate suggestions, invalid
confidence, and invalid reasons are filtered. An accepted edge still passes
the normal duplicate, ownership, and cycle checks.

Groq uses strict structured JSON Schema output for dependency suggestions. A
Groq JSON-generation validation failure may receive one bounded repair retry;
authentication, quota/rate-limit, model, timeout, network, and unrelated
request failures are not retried. See [AI_USAGE.md](AI_USAGE.md) for provider,
grounding, safety, and configuration details.

## Database and Persistence

- **Project** owns an isolated task/dependency graph plus project start and
  target deadline.
- **Task** stores title, description, workflow status, duration, board
  position, and schedule fields.
- **Dependency** stores a prerequisite-to-dependent edge.

Every task belongs to a `project_id`; dependency creation verifies both ends
belong to the selected project. SQLite persists local data across backend
sessions. `planned_start_date` is the user-entered earliest-start constraint;
`start_date` and `end_date` are scheduler-derived values.

## Demo Project

Create the optional evaluator demo data:

```bash
cd backend
python scripts/seed_demo.py
```

`TaskFlow Pro Demo Project` contains 10 realistic software-delivery tasks and
11 dependencies. It demonstrates a multi-level DAG, converging paths,
READY/BLOCKED state, Critical Path, scheduling, Calendar data, a target
deadline, and the no-compounding regression structure.

The command is idempotent and never deletes existing projects, tasks, or
dependencies.

## Quick Start

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example`, set the database and
provider variables you need, then run:

```bash
python -m uvicorn app.main:app --reload --env-file .env
```

The application creates required tables and performs its documented
non-destructive compatibility checks at startup; no manual migration command is
required for normal local use.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Configure these names in `backend/.env`; never commit real values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite connection by default, or another SQLAlchemy connection URL |
| `AI_PROVIDER` | `groq`, `gemini`, or `openai` |
| `GROQ_API_KEY` | Groq server-side credential |
| `GROQ_MODEL` | Groq model identifier |
| `GEMINI_API_KEY` | Optional Gemini credential |
| `GEMINI_MODEL` | Optional Gemini model identifier |
| `OPENAI_API_KEY` | Optional OpenAI credential |
| `OPENAI_MODEL` | Optional OpenAI model identifier |
| `SECRET_KEY` | Server secret setting |
| `DEBUG` | Debug setting |
| `ALLOWED_HOSTS` | Allowed-hosts setting |
| `PORT` | Backend port setting |

## Testing and Reliability

Latest verified backend result: **94 passed**.

```bash
cd backend
python -m pytest -q
```

Frontend static verification:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Do not interpret the frontend build as component-test coverage. The current
frontend Vitest command is not runnable in the installed environment, no
application frontend test files were found, and browser visual verification is
manual. See [TESTING.md](TESTING.md) for the complete test inventory,
controlled failure cases, commands, and coverage gaps.

## Key Assumptions

- Each project dependency graph is a DAG.
- Task durations are non-negative whole days.
- READY/BLOCKED is derived separately from the four workflow columns.
- The scheduler uses predecessor completion constraints and explicit planned
  start constraints; it does not persist derived dates as new manual
  constraints.
- Critical Path uses durations and returns one deterministic representative on
  equal ties.
- AI suggestions are advisory and require explicit human approval.
- Calendar visualizes existing schedule data and does not calculate or mutate
  task dates.

## Limitations

- AI requires a configured external provider and network access; suggestions
  can be imperfect and must be reviewed.
- Calendar is visualization-first and has no drag-to-reschedule interaction.
- Critical Path returns one representative path when ties exist.
- No automated browser/E2E suite is present.
- Frontend component/unit test coverage is currently absent because the
  configured Vitest command is not runnable in the installed environment.
- SQLite is the default evaluation/development persistence layer; this
  repository makes no production-scale load or concurrency claim.

## AI Tool Declaration

### Runtime AI feature

TaskFlow Pro includes a Groq-powered dependency suggestion assistant when
`AI_PROVIDER=groq` is configured. Gemini and OpenAI remain optional provider
implementations. Runtime AI only suggests edges; users accept or reject them,
and deterministic application code performs final DAG validation.

### Development assistance

AI coding assistance was used during implementation, debugging, test
development, and documentation. Generated suggestions and code were reviewed
before use. AI did not replace the deterministic DAG, scheduling, persistence,
or validation logic; automated tests verify those core behaviors.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [AI usage and safety](AI_USAGE.md)
- [Testing and reliability](TESTING.md)
- [Backend setup and demo seed](backend/README.md)
