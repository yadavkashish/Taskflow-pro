# TaskFlow Pro Backend README

# TaskFlow Pro Backend

## Overview
TaskFlow Pro is a dependency-aware project management tool that enhances traditional Kanban boards by introducing a Directed Acyclic Graph (DAG) dependency engine. This backend service is built using FastAPI and provides RESTful APIs for managing tasks and their dependencies.

## Problem Statement
Traditional project management tools often treat tasks independently, leading to inefficiencies when managing dependencies. TaskFlow Pro addresses this by automatically managing task states based on their dependencies, ensuring that tasks are only marked as ready when all prerequisites are complete.

## Features
- Create, read, update, and delete tasks and dependencies.
- Automatic status updates based on task dependencies.
- Cycle detection to prevent invalid dependency graphs.
- Date propagation through downstream dependencies.
- Integration with an AI service for suggesting dependencies.

## Architecture
The backend is structured into several key components:
- **Models**: Defines the data structures for tasks and dependencies.
- **Schemas**: Pydantic models for data validation and serialization.
- **API**: Endpoints for managing tasks and dependencies.
- **Services**: Business logic, including the DAG engine and scheduling.
- **Tests**: Unit and integration tests to ensure functionality and correctness.

## Tech Stack
- **Backend Framework**: FastAPI
- **Database**: SQLite for local development and automated tests; PostgreSQL is supported for deployment through SQLAlchemy and `psycopg`.
- **ORM**: SQLAlchemy
- **Testing**: pytest
- **Dependency Management**: Pydantic

## Database

TaskFlow Pro uses SQLAlchemy with SQLite persistence for local development and
automated tests. By default the backend uses `sqlite:///./taskflow.db`.

For PostgreSQL deployment, set an untracked environment value such as:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Never commit real database credentials. SQLite's `check_same_thread` option is
applied only to SQLite engines; PostgreSQL engines use the `psycopg` driver
without SQLite-specific connection arguments. A fresh configured database is
initialized through SQLAlchemy metadata creation. Existing startup compatibility
migrations are additive and dialect-safe, but are not a replacement for a
versioned migration process: introduce Alembic before evolving a deployed
production schema beyond the documented compatibility columns.

After configuring PostgreSQL, an optional non-destructive verification creates
one uniquely named temporary project, two tasks, and one dependency; verifies
them; then deletes only those records:

```bash
python scripts/verify_postgresql.py
```

## Deployment configuration

The backend reads deployment configuration from environment variables only:

| Variable | Deployment purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL SQLAlchemy URL, using `postgresql+psycopg://...` |
| `FRONTEND_ORIGIN` | Vercel browser origin, for example `https://your-app.vercel.app` |
| `AI_PROVIDER` | Optional advisory provider such as `groq` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq server-side configuration only |
| `PORT` | Render-provided listening port |

Render settings: set the service root directory to `backend`, use build command
`python -m pip install -r requirements.txt`, and start command
`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Do not enable
reload in deployment. `GET /health` is a liveness endpoint returning only
`{"status":"ok"}`.

- **Project** stores its name, description, start date, target deadline, and timestamps.
- **Task** stores its owning `project_id`, title, description, workflow status,
  planned and calculated dates, duration, board column/order, and timestamps.
- **Dependency** stores predecessor/successor task IDs and its creation time.

Projects isolate their task graphs. Dependency creation verifies project
ownership, rejects duplicates and self-links, and the DAG engine rejects cycles
before an edge is persisted. READY/BLOCKED are deliberately derived from
predecessor completion; they are not stored workflow statuses.

### Schedule date migration

`planned_start_date` is the optional user-entered earliest-start constraint.
`start_date` and `end_date` are derived schedule values. On startup, the
backend adds `planned_start_date` to existing databases if needed without
dropping tables or data. Existing `start_date` values are copied into the new
constraint column once because their historical origin cannot be known safely;
new dependency propagation never writes back into the constraint column.

## DAG Algorithm Explanation
The DAG engine is responsible for:
- Cycle detection when adding dependencies.
- Deriving task readiness based on prerequisite completion.
- Propagating date changes through dependent tasks without double-counting delays.

## Date Propagation Explanation
When a task's date changes, the earliest start date for downstream tasks is recalculated based on the finish times of all prerequisites. This ensures that all dependent tasks are updated correctly without summing delays from multiple paths.

## AI Architecture
The backend integrates with an AI service to suggest potential dependencies based on existing tasks. Suggestions are validated before being accepted to ensure they do not violate the DAG constraints.

## API Documentation
- **GET /tasks**: Retrieve all tasks.
- **POST /tasks**: Create a new task.
- **GET /tasks/{id}**: Retrieve a specific task by ID.
- **PUT/PATCH /tasks/{id}**: Update a specific task.
- **DELETE /tasks/{id}**: Delete a specific task.
- **POST /tasks/{id}/move**: Change the status of a task.
- **GET /dependencies**: Retrieve all dependencies.
- **POST /dependencies**: Create a new dependency.
- **DELETE /dependencies/{id}**: Remove a dependency.
- **POST /suggest-dependencies**: Get AI-generated dependency suggestions.

## Setup Instructions
1. Clone the repository.
2. Navigate to the `backend` directory.
3. Install dependencies using `pip install -r requirements.txt`.
4. Set up the database and environment variables as specified in `.env.example`.
5. Run the application using `uvicorn app.main:app --reload`.

## Running Tests
To run the tests, execute:
```
pytest
```

## Seed Data

Create or safely re-open the idempotent demonstration project with:

```bash
python scripts/seed_demo.py
```

Run the command from `backend/`. It creates `TaskFlow Pro Demo Project`
only when it does not exist, adds only missing named demo tasks and dependency
edges, and uses the existing scheduler to calculate dates. The 10-task dataset
demonstrates multi-level and converging dependencies, derived Ready/Blocked
states, Critical Path, schedule propagation, Calendar data, and a project
deadline. It never drops tables, deletes projects, or resets user data.

## Example Demo Flow
1. Start the backend server.
2. Use the API to create tasks and dependencies.
3. Demonstrate task status changes and dependency management.

## Known Limitations
- The AI suggestion feature may not always provide accurate results.
- Performance may vary based on the complexity of the task graph.

## Security Considerations
Ensure that sensitive information such as API keys and database credentials are stored securely and not exposed in the codebase.

## AI Usage Disclosure
The AI service is used to suggest dependencies but does not control the correctness of the dependency graph. All suggestions are validated against existing tasks.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.
