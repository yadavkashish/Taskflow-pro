# AI usage in TaskFlow Pro

## Role and control

TaskFlow Pro optionally uses OpenAI (`gpt-4o-mini`) to propose likely task dependency edges. AI is advisory only: it never creates, deletes, or changes dependencies. A user must explicitly request analysis, then accept or reject each suggestion.

On acceptance, the frontend uses the normal dependency-create endpoint. The deterministic DAG engine remains authoritative and can reject self-dependencies, duplicates, and cycles before an edge is persisted.

## API and data sent

The dashboard calls `POST /suggestions/suggest-dependencies` only after the user selects **Analyze Tasks**. Its request body is:

```json
{
  "tasks": [
    {"id": 1, "title": "Database schema", "description": "..."}
  ]
}
```

Only each task's ID, title, and description are sent to the model. A response is a list of proposed `predecessor_id` → `successor_id` edges with a reason and a confidence from 0 to 1.

## Configuration and availability

Configure `OPENAI_API_KEY` only in the backend environment; see `backend/.env.example`. Never put it in a `VITE_*` variable, frontend source, or committed `.env` file.

Without an API key, CRUD, dependencies, scheduling, and DAG behavior continue normally. The assistant reports that AI suggestions are unavailable; provider failures show a concise retry message. Neither case fabricates results or modifies the graph.
