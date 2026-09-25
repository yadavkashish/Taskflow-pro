# TaskFlow Pro Frontend Documentation

## Overview
TaskFlow Pro is a dependency-aware project management tool that enhances traditional Kanban boards by introducing a Directed Acyclic Graph (DAG) dependency engine. This application allows users to manage tasks with dependencies, ensuring that tasks automatically reflect their readiness based on prerequisite completion.

## Features
- **Kanban Board**: A visual representation of tasks organized in columns (Backlog, In Progress, Review, Done).
- **Task Management**: Create, edit, delete, and reorder tasks.
- **Dependency Management**: Add and remove dependencies between tasks.
- **Automatic Status Updates**: Tasks automatically become BLOCKED or READY based on their dependencies.
- **Date Propagation**: Changes in task dates propagate through dependent tasks.
- **AI Suggestions**: Optional AI-generated suggestions for task dependencies.

## Architecture
The frontend is built using React and TypeScript, utilizing Vite for development and build processes. The application communicates with the backend via REST APIs.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, @dnd-kit for drag-and-drop functionality.
- **State Management**: Custom hooks for managing task-related state.
- **API Communication**: Axios or Fetch for making API calls to the backend.

## Running the Frontend
1. **Install Dependencies**: Run `npm install` in the `frontend` directory.
2. **Start Development Server**: Run `npm run dev` to start the Vite development server.
3. **Access the Application**: Open your browser and navigate to `http://localhost:3000`.

## Environment Variables
Create a `.env` file in the `frontend` directory based on the `.env.example` provided. Ensure to set the necessary environment variables for API communication.

## Testing
To run tests for the frontend, use the following command:
```
npm run test
```

## Seed Data
The application comes with pre-defined seed data to demonstrate functionality. This data can be populated in the backend to visualize the task management features effectively.

## Example Demo Flow
1. Open the dashboard to view seeded tasks.
2. Demonstrate adding a dependency between tasks.
3. Show how tasks become BLOCKED or READY based on their dependencies.
4. Move tasks between columns and observe the automatic updates.
5. Use the AI suggestion feature to propose new dependencies.

## Known Limitations
- The AI suggestions are not guaranteed to be accurate and should be reviewed before acceptance.
- Performance may vary based on the number of tasks and dependencies.

## Security Considerations
Ensure that sensitive information, such as API keys, is not exposed in the frontend code. Use environment variables to manage secrets securely.

## AI Usage Disclosure
The application utilizes AI to suggest potential task dependencies. These suggestions are optional and do not automatically modify the dependency graph without user confirmation.