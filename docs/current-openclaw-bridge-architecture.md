# Current Mission Control agent bridge architecture

This document describes the currently implemented local Mission Control bridge architecture for Constructor-owned task execution and the underlying gateway-backed agent discovery path.

It is a working implementation note, not a stable public API guarantee.

## Scope

Current Mission Control integration points:
- `POST /api/tasks/:taskId/openclaw/dispatch`
- `POST /api/tasks/:taskId/openclaw/webhook`
- `POST /api/tasks/:taskId/constructor/dispatch`
- `POST /api/tasks/:taskId/constructor/callback`
- `GET /api/workspaces/current/openclaw` (gateway settings compatibility path)
- `PATCH /api/workspaces/current/openclaw` (gateway settings compatibility path)
- `GET /api/workspaces/current/constructor`
- `PATCH /api/workspaces/current/constructor`
- `POST /api/workspaces/current/constructor/sync`

Current upstream Constructor ingress:
- `POST ${CONSTRUCTOR_BASE_URL}/source/mission-control/events`

Default local Constructor base URL when unset in route env:
- `CONSTRUCTOR_BASE_URL=http://127.0.0.1:8787`

## Workspace-managed integration settings

Mission Control now exposes workspace-level integration settings in **Manage Workspace** for Constructor.

Current Constructor workspace settings include:
- label
- base URL
- enabled flag
- optional callback token storage
- gateway token status visibility
- last sync status metadata

Gateway connection details are still persisted through the existing workspace OpenClaw integration record underneath, but that is now a compatibility/storage seam rather than the intended product-facing workflow.

These settings are owner-only through workspace APIs.

## Constructor dispatch behavior

When an owner dispatches a task through the Constructor UI card, Mission Control:
1. loads the task resource and recent comments
2. builds a compact final-answer-oriented instruction
3. generates a task-scoped callback URL back into Mission Control
4. sends a `task.execute` event to Constructor
5. returns `202 Accepted` if Constructor accepts the execution

Current request shape sent upstream:

```json
{
  "version": "v1",
  "source": "mission-control",
  "eventType": "task.execute",
  "eventId": "evt-...",
  "idempotencyKey": "idem-...",
  "traceId": "trace-...",
  "occurredAt": "2026-04-03T06:00:00.000Z",
  "payload": {
    "externalTaskId": "mc-task-<taskId>-<timestamp>",
    "targetAgent": "main",
    "instruction": "Task: ...",
    "context": {
      "missionControl": {
        "taskId": "...",
        "title": "...",
        "status": "...",
        "priority": "...",
        "assignee": null,
        "project": "...",
        "projectSlug": "...",
        "due": null
      },
      "constructor": {
        "mode": "mission-control-dispatch",
        "expectedDelivery": "return final answer through Constructor callback so Mission Control can post the task comment"
      }
    },
    "metadata": {
      "origin": "mission-control-ui",
      "taskId": "...",
      "integration": "constructor"
    },
    "routingHints": {},
    "callback": {
      "required": true,
      "url": "https://mission-control.example/api/tasks/<taskId>/constructor/callback"
    },
    "retryPolicy": {
      "maxDispatchAttempts": 5,
      "maxCallbackAttempts": 5
    },
    "timeoutPolicy": {
      "executionTimeoutMs": 300000,
      "dispatchTimeoutMs": 30000,
      "callbackTimeoutMs": 10000
    }
  }
}
```

### Important design choice

The Constructor flow is intentionally callback-oriented.

Mission Control tells Constructor:
- do **not** access Mission Control directly during execution
- do **not** post comments directly
- return the final answer through the Constructor callback route

Mission Control remains the writer of task comments in this flow.

## Constructor accepted response handling

Mission Control treats the upstream Constructor response as async acceptance.

Expected success shape:

```json
{
  "accepted": true,
  "bridgeExecutionId": "constructor:...",
  "externalTaskId": "mc-task-...",
  "executionState": "queued",
  "message": "execution accepted and queued"
}
```

Mission Control returns `202` to the UI with a normalized dispatch payload.

## Constructor callback behavior

Constructor terminal callbacks are sent to:
- `POST /api/tasks/:taskId/constructor/callback`

Mission Control currently recognizes these terminal events:
- `execution.completed`
- `execution.failed`
- `execution.timed_out`
- `execution.canceled`

Current state mapping:
- `execution.completed` → task status `review`
- `execution.failed` → task status `blocked`
- `execution.timed_out` → task status `blocked`
- `execution.canceled` → task status `blocked`

Current comment behavior:
- Mission Control creates the visible task comment itself
- completed callbacks prefer `payload.result.text`
- failed callbacks prefer `payload.error.*` text
- if no useful final text exists, Mission Control writes a fallback terminal comment
- callback comments are authored as `Constructor` with role `Agent`

## Callback idempotency

Mission Control enforces durable callback deduplication with `TaskCallbackReceipt`.

Receipt uniqueness is keyed by:
- `taskId`
- `source`
- `eventType`
- `bridgeExecutionId`

Current behavior on duplicate terminal callback retry:
- do not create a second task comment
- do not apply the task status transition a second time
- append an execution log entry noting duplicate ignore when possible
- return `{ "ok": true, "duplicate": true }`

Regression coverage includes:
- `app/tests/constructor-callback-dedupe.test.mjs`
- `app/tests/constructor-dispatch.test.mjs`

## Logging behavior

Mission Control appends system execution log lines for Constructor callbacks, including:
- callback received
- duplicate callback ignored

These writes use the system path and do not depend on agent membership lookup.

## Current limitations

- this document describes the working local implementation, not a stable public API
- the dispatch route still resolves `CONSTRUCTOR_BASE_URL` from route environment, not yet from saved workspace settings
- Constructor callback token storage exists in workspace settings, but callback request verification is not yet enforced in the callback route
- in-flight Constructor execution polling is not wired into Mission Control UI yet

## Validation notes

Locally verified in this workstream:
- focused Constructor dispatch contract tests pass
- focused Constructor callback dedupe tests pass
- Prisma generate and migrate deploy pass
- Mission Control production build passes
- workspace-manageable Constructor settings are present in the UI
