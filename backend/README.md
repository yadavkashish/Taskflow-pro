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
- **Database**: PostgreSQL (with SQLite fallback for development)
- **ORM**: SQLAlchemy
- **Testing**: pytest
- **Dependency Management**: Pydantic

## Database Schema
The database consists of two main tables:
1. **Task**: Stores task details including title, description, status, dates, and timestamps.
2. **Dependency**: Manages relationships between tasks, ensuring no cycles or duplicate edges.

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
Seed data can be found in `backend/app/seed/seed_data.py` for populating the database with initial tasks and dependencies.

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