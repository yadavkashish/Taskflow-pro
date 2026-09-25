# AI_USAGE.md

# AI Usage in TaskFlow Pro

## Overview

TaskFlow Pro integrates AI capabilities to enhance the user experience by providing intelligent suggestions for task dependencies. This document outlines how AI is utilized within the application, including the interaction with the LLM (Large Language Model) API and the guidelines for its use.

## AI Features

1. **Dependency Suggestions**: 
   - The application can suggest potential prerequisite relationships between tasks based on their titles and descriptions.
   - Users can request suggestions through the API endpoint `/suggest-dependencies`.

2. **User Interaction**:
   - Suggested dependencies are presented to the user, who can choose to accept or dismiss them.
   - If a user accepts a suggestion, the application will validate the dependency through the existing DAG engine before persisting it.

3. **Error Handling**:
   - If the LLM API key is missing or the API call fails, the application will continue to function without crashing, displaying a graceful message to the user.

## LLM API Interaction

- The backend service `llm_service.py` is responsible for communicating with the LLM API.
- The prompt sent to the LLM includes:
  - Current task information (title and description).
  - Existing tasks with their IDs, titles, descriptions, and statuses.
- The expected response format is a JSON array of suggested dependencies, each containing:
  - `task_id`: The ID of the suggested task.
  - `reason`: A brief explanation for the suggestion.
  - `confidence`: A confidence score indicating the likelihood of the suggestion being valid.

## Guidelines for AI Usage

- **Validation**: All AI-generated suggestions must be validated against the existing task graph to ensure they do not create cycles or duplicate dependencies.
- **Transparency**: Users should be informed that AI suggestions are just that—suggestions. The final decision to create a dependency lies with the user.
- **No Automatic Actions**: The AI will never automatically create or modify dependencies without user consent.

## Conclusion

The integration of AI in TaskFlow Pro aims to streamline project management by providing intelligent insights while maintaining user control over the dependency graph. This careful balance ensures that the application remains robust and user-friendly.