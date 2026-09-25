# TaskFlow Pro

## Project Overview
TaskFlow Pro is a dependency-aware project management tool that enhances traditional Kanban boards by introducing a deterministic Directed Acyclic Graph (DAG) dependency engine. This allows for automatic task status updates based on prerequisites, date propagation through downstream dependencies, and cycle detection to maintain graph integrity.

## Problem Statement
Traditional project management tools often treat tasks independently, leading to inefficiencies and confusion when managing dependencies. TaskFlow Pro addresses these issues by providing a robust framework for managing task dependencies, ensuring that tasks are only marked as ready when all prerequisites are complete.

## Features
- Dependency-aware task management
- Automatic status updates based on task dependencies
- Cycle detection to prevent invalid dependencies
- Date propagation for downstream tasks
- Integration with an AI service for dependency suggestions
- A polished user interface with a Kanban board layout

## Architecture
The application is structured into a backend and a frontend, with a clear separation of concerns. The backend is built using FastAPI and PostgreSQL, while the frontend is developed with React and Vite.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, @dnd-kit
- **Backend**: Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL
- **AI**: OpenAI API for dependency suggestions

## Database Schema
### Task Model
- id
- title
- description
- status (backlog, in_progress, review, done)
- start_date
- end_date
- duration
- board_column
- position/order
- created_at
- updated_at

### Dependency Model
- id
- predecessor_id
- successor_id
- created_at

## DAG Algorithm Explanation
The DAG engine is responsible for managing task dependencies, ensuring that tasks are only marked as ready when all prerequisites are complete. It also handles cycle detection and date propagation through the task graph.

## Date Propagation Explanation
When a task's start date changes, the end date is recalculated based on its duration. The changes are propagated through downstream tasks, ensuring that all dependent tasks are updated accordingly without double-counting delays.

## AI Architecture
The AI component interacts with an external LLM API to suggest potential task dependencies based on existing tasks. Suggestions are validated before being accepted to ensure they do not violate the DAG constraints.

## API Documentation
The backend exposes a RESTful API for managing tasks and dependencies, including endpoints for CRUD operations and AI suggestions.

## Setup Instructions
1. Clone the repository.
2. Navigate to the backend directory and install dependencies using `pip install -r requirements.txt`.
3. Set up the database and run migrations.
4. Start the backend server.
5. Navigate to the frontend directory and install dependencies using `npm install`.
6. Start the frontend development server.

## Environment Variables
- DATABASE_URL
- OPENAI_API_KEY

## Running Backend
To run the backend, use the command:
```
uvicorn app.main:app --reload
```

## Running Frontend
To run the frontend, use the command:
```
npm run dev
```

## Running Tests
Backend tests can be run using:
```
pytest
```
Frontend tests can be run using:
```
npm run test
```

## Seed Data
The application includes seed data for initial tasks and dependencies, which can be populated using the seed script.

## Example Demo Flow
1. Open the dashboard.
2. Show seeded tasks.
3. Explain the dependency graph.
4. Demonstrate task status changes and dependency updates.

## Known Limitations
- The AI suggestions are not always accurate and should be reviewed before acceptance.
- Performance may vary based on the number of tasks and dependencies.

## Security Considerations
Ensure that sensitive information such as API keys and database credentials are stored securely and not exposed in the codebase.

## AI Usage Disclosure
The application utilizes an AI service for generating dependency suggestions, which are optional and must be validated before use.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.