# AI usage in TaskFlow Pro

## Purpose and providers

TaskFlow Pro optionally uses an LLM to suggest plausible prerequisite relationships between tasks in the currently selected project. The active provider is selected by `AI_PROVIDER`:

- `groq` uses the official Groq Python SDK.
- `gemini` uses the Google GenAI Python SDK.
- `openai` uses the OpenAI Python SDK.

AI only suggests. It never creates, deletes, or updates dependencies. A user explicitly requests analysis and must Accept or Reject every individual suggestion.

## Grounding, structured output, and validation

The frontend calls `POST /projects/{project_id}/suggestions/suggest-dependencies`. The backend verifies every submitted ID belongs to the selected project, then rebuilds the provider input from database records. Providers receive only that project's task IDs, titles, descriptions, and existing dependency edges.

The shared prompt permits supplied IDs only, rejects speculative relationships, self-links, and existing edges, and asks for JSON. Groq uses strict JSON Schema output for the dependency-suggestion envelope; if Groq reports a JSON-generation validation failure, the backend permits one repair retry only. Gemini uses response-schema JSON mode; OpenAI uses JSON-object mode. All output is parsed as JSON and validated with Pydantic. Invalid IDs, cross-project IDs, self-links, existing edges, duplicate output, empty reasons, and invalid confidence values are filtered before reaching the frontend. No `eval` or `exec` is used.

## Human approval and DAG safety

Accepting a suggestion calls the normal project dependency endpoint; it does not call an LLM again. The deterministic DAG engine remains authoritative for rejecting duplicate edges, cross-project edges, self-links, and cycles before persistence. Confidence is advisory only and never auto-accepts an edge.

## Configuration

Configure provider credentials only in the backend environment:

```text
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=...
```

Gemini and OpenAI remain available when configured:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=...

AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Never put provider keys in a `VITE_*` variable, frontend source, or a committed `.env` file.

## Failure behavior

Missing configuration, authentication failures, quota/rate limits, timeouts, network failures, unsupported provider requests, and malformed provider output produce controlled API errors without stack traces or secrets. The JSON repair retry is not used for authentication, rate-limit, model, timeout, network, or unrelated invalid-request failures. Core TaskFlow CRUD, dependency management, scheduling, and DAG validation continue to work when AI is unavailable. AI analysis never fabricates or persists dependencies.
