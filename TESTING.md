# TaskFlow Pro — Testing & Reliability

This document is the evaluator-facing record of the automated verification
available in this repository. Results below were run from this workspace on
September 27, 2026. TaskFlow Pro's backend test fixtures use an isolated SQLite
database, so the suite does not alter the normal development database.

## Verification Summary

| Check | Result |
| --- | --- |
| Backend automated tests | PASS — 98 passed |
| Backend test collection | PASS — 98 tests collected |
| TypeScript | PASS — `npx tsc --noEmit` |
| Production frontend build | PASS — `npm run build` |
| PostgreSQL persistence verification | PASS — temporary project, tasks, and dependency created, read, and removed safely |
| Demo seed idempotency | PASS — covered by automated tests |
| Cycle rejection | PASS — covered by automated tests |
| No-compounding regression | PASS — covered by automated tests |
| Rollback regression | PASS — covered by automated tests |
| Frontend component/unit tests | NOT AVAILABLE — see [Known Limitations](#known-limitations-and-coverage-gaps) |

## Automated Test Suite

Run the full backend suite:

```bash
cd backend
python -m pytest -q
```

Inspect the exact test inventory:

```bash
cd backend
python -m pytest --collect-only -q
```

The latest verification run collected and passed **96 tests**. The suite
includes these modules:

| Test module | Verified behavior |
| --- | --- |
| `test_api.py` | Task CRUD, dependency creation, cycle rejection, schedule update propagation, persisted ordering and cross-column task moves |
| `test_dag_engine.py` | Self/direct/indirect cycle rejection, valid and duplicate dependencies, derived READY/BLOCKED state, rollback, converging paths, persistence |
| `test_scheduling.py` | Date calculation, derived READY/BLOCKED state, propagation, rollback |
| `test_schedule_recomputation.py` | Full-chain recomputation, earlier/later root movement, diamond joins, latest-predecessor constraint, dependency add/remove, planned-start constraints, preview/apply parity |
| `test_critical_path.py` | Simple chains, diamonds, parallel roots, deterministic ties, missing-duration handling |
| `test_impact_analysis.py` | Read-only impact previews, chain/diamond propagation, critical-path changes, invalid duration rejection |
| `test_project.py` | Project CRUD, project-scoped tasks/dependencies/critical path/health/impact, project deletion isolation |
| `test_project_health.py` | Healthy/attention/at-risk findings, direct blockers, critical-path data, endpoint contract |
| `test_deadline_status.py` | Project-scoped completion/deadline variance, on-track, no-deadline, no-schedule, date validation |
| `test_suggestions.py` | Advisory AI suggestions, project grounding/filtering, no automatic persistence, normal DAG acceptance, provider configuration/error handling, Groq structured output and bounded retry behavior |
| `test_demo_seed.py` | Idempotent 10-task demo seed, unrelated-project preservation, cycle rejection, Critical Path, converging-path delay, rollback state |
| `test_persistence_storage.py` | Cross-session project/task/dependency persistence and demo-seed idempotency |
| `test_database_configuration.py` | SQLite-only engine options, PostgreSQL engine configuration without a live connection, and portable model DDL compilation |
| `test_deployment_configuration.py` | Explicit CORS origin parsing and secret-free backend liveness endpoint |

## Frontend Verification

Run static type checking and the production build:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Both commands passed in the latest verification.

The repository defines `npm test` as `vitest`, but the current installed
frontend environment does not provide a runnable `vitest` binary, and no
application frontend test files are present outside `node_modules`.
Accordingly, this repository does **not** claim automated frontend
component-test coverage. TypeScript and Vite production-build verification are
the currently runnable frontend checks.

## Demo Seed Verification

Create the optional evaluator demo data without deleting user data:

```bash
cd backend
python scripts/seed_demo.py
```

The seed creates or reopens **TaskFlow Pro Demo Project** with 10 realistic
software-delivery tasks, 11 acyclic dependency edges, project dates, derived
schedule dates, a converging DAG, and a naturally calculated Critical Path.

It is idempotent: a second run reuses the same named project and does not
duplicate tasks or dependencies. The seed uses normal SQLAlchemy models and
the existing scheduling service; it does not reset tables or invoke an LLM.

## Controlled Failure Cases

The following are intentional, automated behaviors—not unhandled failures:

- Self, direct, and indirect dependency cycles are rejected before persistence.
- Duplicate dependencies, self-links, and cross-project dependency attempts are rejected.
- READY/BLOCKED remains derived from predecessor completion; it is not persisted as a workflow status.
- A rollback from DONE to IN PROGRESS returns affected dependents to BLOCKED.
- Diamond/converging schedules use the latest predecessor completion and do not double-count a shared upstream delay.
- Missing or invalid task durations make weighted Critical Path analysis incomplete or reject invalid input rather than guessing.
- AI suggestion analysis filters unknown IDs, foreign-project IDs, self-links, existing edges, duplicates, invalid confidence, and malformed items.
- AI analysis is read-only. Only a user-approved suggestion reaches the normal dependency endpoint, where DAG validation remains authoritative.
- Missing provider configuration, authentication failure, rate limit, malformed provider output, unsupported requests, and network/provider errors return controlled API errors without provider secrets.
- Groq JSON-validation failures receive at most one repair retry; authentication, rate-limit, and unrelated bad-request failures are not retried.

## Known Limitations and Coverage Gaps

- Frontend unit/component tests are not currently runnable: `npm test -- --run`
  fails because `vitest` is not available in the installed environment, and
  no application frontend test files were found. This is documented rather
  than masked by disabling checks.
- Browser-level visual verification is manual. The Calendar, responsive
  layouts, explicit workflow-status controls, and route transitions are not covered
  by an automated browser test suite in this repository.
- Live LLM behavior is intentionally not exercised by pytest. Provider
  requests are mocked in automated tests so the suite does not require keys,
  consume quota, or depend on a network connection.
- SQLite persistence is tested locally and across sessions. PostgreSQL engine
  configuration and model DDL are automated without a live server; the safe
  `scripts/verify_postgresql.py` command was also run successfully against the
  configured PostgreSQL database. The repository does not claim load,
  concurrency, or production-database benchmark verification.

## Related Documentation

- [Architecture](ARCHITECTURE.md)
- [AI Usage and Safety](AI_USAGE.md)
- [Backend setup and demo seed](backend/README.md)
