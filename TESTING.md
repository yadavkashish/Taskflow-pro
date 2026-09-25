# TESTING.md

# Testing Strategies for TaskFlow Pro

## Overview
This document outlines the testing strategies employed in the TaskFlow Pro project, detailing the types of tests, frameworks used, and how to run them.

## Testing Frameworks
- **Backend**: 
  - `pytest` is used for unit and integration testing of the FastAPI application.
- **Frontend**: 
  - `Vitest` and `React Testing Library` are used for testing React components and hooks.

## Backend Testing

### Unit Tests
Unit tests are written to verify the functionality of individual components, such as the DAG engine and scheduling logic.

#### Key Tests
1. **DAG Engine Tests**:
   - Test for cycle detection (self, direct, and indirect cycles).
   - Test for valid dependencies.
   - Test for status derivation (BLOCKED and READY).
   - Test for rollback behavior when tasks are moved back to previous statuses.
   - Test for date propagation across dependencies.

2. **Scheduling Tests**:
   - Test for correct scheduling based on dependencies.
   - Test for propagation of date changes through the task graph.

### Integration Tests
Integration tests ensure that the API endpoints function correctly and interact with the database as expected.

#### Key Tests
- Test all CRUD operations for tasks and dependencies.
- Test the dependency creation endpoint for validation and cycle detection.
- Test the AI suggestion endpoint for valid responses.

## Frontend Testing

### Component Tests
Component tests verify that individual React components render correctly and behave as expected.

#### Key Tests
- Test rendering of the Kanban board and task cards.
- Test the functionality of the task modal for creating and editing tasks.
- Test the dependency editor for adding and removing dependencies.

### Hook Tests
Custom hooks are tested to ensure they manage state and API calls correctly.

## Running Tests

### Backend
To run the backend tests, navigate to the `backend` directory and execute:
```
pytest
```

### Frontend
To run the frontend tests, navigate to the `frontend` directory and execute:
```
npm run test
```

## Test Coverage
Ensure that tests cover a significant portion of the codebase. Aim for at least 80% coverage for both backend and frontend components.

## Conclusion
Testing is a critical part of the development process for TaskFlow Pro. By following the outlined strategies and utilizing the specified frameworks, we can ensure a robust and reliable application.