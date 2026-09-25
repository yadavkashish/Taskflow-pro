# ARCHITECTURE.md

# TaskFlow Pro Architecture

## Overview
TaskFlow Pro is a dependency-aware project management tool designed to enhance task management through a directed acyclic graph (DAG) dependency engine. This document outlines the architecture of the application, including its components, data flow, and interactions between the frontend and backend.

## Components

### Backend
The backend is built using FastAPI and is responsible for handling API requests, managing the database, and implementing the DAG engine. The key components include:

- **main.py**: The entry point for the FastAPI application, setting up routes and middleware.
- **database.py**: Manages database connections and configurations using SQLAlchemy.
- **models/**: Contains the data models for tasks and dependencies.
  - **task.py**: Defines the Task model with fields such as id, title, description, status, start_date, end_date, duration, and timestamps.
  - **dependency.py**: Defines the Dependency model with fields such as id, predecessor_id, successor_id, and timestamps.
- **schemas/**: Contains Pydantic schemas for data validation and serialization.
- **api/**: Implements RESTful API endpoints for managing tasks and dependencies.
- **services/**: Contains business logic, including the DAG engine for cycle detection, status derivation, and date propagation.

### Frontend
The frontend is built using React and Vite, providing a user-friendly interface for managing tasks and visualizing dependencies. Key components include:

- **App.tsx**: The main component that sets up routing and layout.
- **KanbanBoard.tsx**: Displays tasks in a Kanban board format.
- **TaskCard.tsx**: Represents individual tasks with relevant details.
- **DependencyGraph.tsx**: Visualizes task dependencies as a graph.
- **DependencyEditor.tsx**: Allows users to add or remove dependencies between tasks.
- **SummaryCards.tsx**: Displays summary statistics of tasks.

## Data Flow
1. **User Interaction**: Users interact with the frontend to create, edit, and manage tasks and dependencies.
2. **API Requests**: The frontend makes API calls to the backend to perform CRUD operations on tasks and dependencies.
3. **Business Logic**: The backend processes requests, applying business logic through services and models.
4. **Database Operations**: Data is persisted in the database, ensuring that all important information is retained across sessions.
5. **Real-time Updates**: The frontend updates the UI based on responses from the backend, providing a seamless user experience.

## DAG Engine
The DAG engine is a core component that manages task dependencies. It ensures that:
- Tasks are marked as BLOCKED or READY based on their prerequisites.
- Date changes propagate through downstream dependencies without double-counting delays.
- Cycles in the dependency graph are detected and rejected before persistence.

## Conclusion
TaskFlow Pro's architecture is designed to provide a robust and scalable solution for project management. By leveraging a clean separation of concerns between the frontend and backend, along with a powerful DAG engine, the application aims to deliver a polished user experience while maintaining data integrity and correctness.