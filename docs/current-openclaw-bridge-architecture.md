# Current Mission Control agent bridge architecture

This document describes the currently implemented local Mission Control bridge architecture for Constructor-owned task execution and the retained OpenClaw compatibility paths.

It is a working implementation note, not a stable public API guarantee.

## Scope

Current Mission Control integration points:
- `POST /api/tasks/:taskId/constructor/dispatch`
- `POST /api/tasks/:taskId/constructor/callback`
- `POST /api/tasks/:taskId/openclaw/dispatch` (gateway dispatch compatibility path)
- `POST /api/tasks/:taskId/openclaw/webhook` (gateway webhook compatibility path)
- `GET /api/workspaces/current/openclaw` (gateway settings compatibility path)
- `PATCH /api/workspaces/current/openclaw` (gateway settings compatibility path)
- `GET /api/workspaces/current/constructor`
- `PATCH /api/workspaces/current/constructor`
- `POST /api/workspaces/current/constructor/sync`

Current upstream Constructor APIs used by Mission Control:
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/agents` for agent sync
- `POST ${CONSTRUCTOR_BASE_URL}/api/v1/tasks` for task dispatch

Default local Constructor base URL when unset in route env:
- `CONSTRUCTOR_BASE_URL=http://127.0.0.1:8787`

## Workspace-managed integration settings

Mission Control now exposes workspace-level integration settings in **Manage Workspace** for Constructor.

Current Constructor workspace settings include:
- label
- base URL
- public API token storage
- enabled flag
- optional callback token storage
- last sync status metadata

Constructor sync state is now persisted on the Constructor integration record itself.

Gateway connection details are still persisted through the existing workspace OpenClaw integration record for retained compatibility routes, but that is no longer the Constructor agent discovery path.

These settings are owner-only through workspace APIs.

## Constructor agent sync behavior

Mission Control now syncs Constructor agents through the public API route:
- `GET /api/v1/agents`

Current sync behavior:
1. loads the active workspace Constructor integration
2. calls Constructor with `Authorization: Bearer <api token>`
3. normalizes returned agent ids and names
4. upserts those agents into Mission Control memberships with `sourceSystem=constructor`
5. auto-adds synced agents to all workspace projects so they are available for task assignment
6. disables previously synced Constructor agents that are no longer returned by the API

Only `sourceSystem=constructor` agents are considered dispatchable through the Constructor-owned task flow.

## Constructor dispatch behavior

The intended product-facing dispatch entrypoint is Constructor.

The older `/api/tasks/:taskId/openclaw/dispatch` route is still retained as an internal/compatibility bridge for the gateway-backed OpenClaw path, but Constructor dispatch no longer reuses the retired event-ingress seam.

When an owner dispatches a task through the Constructor UI card, Mission Control:
1. loads the task resource and recent comments
2. resolves `targetAgent` from the assigned Constructor agent or the synced default Constructor agent
3. builds a compact final-answer-oriented instruction
4. generates a task-scoped callback URL back into Mission Control
5. submits a public API task request to Constructor
6. returns `202 Accepted` if Constructor accepts the execution

Current request shape sent upstream:

```json
{
  "externalTaskId": "mc-task-<taskId>-<timestamp>",
  "idempotencyKey": "mc-task-<taskId>-<timestamp>",
  "targetAgent": "constructor-default",
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
```

Public API required fields supplied by Mission Control:
- `externalTaskId`
- `idempotencyKey`
- `targetAgent`
- `instruction`

Constructor dispatch acceptance is logged immediately in Mission Control execution logs so the task page shows progress before the callback arrives.

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

Mission Control returns `202` to the UI with a normalized dispatch payload and updates the task to `in_progress`.

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
- callback comments are authored as the responding synced Constructor agent when Mission Control can resolve that membership, otherwise they fall back to `Constructor`

Constructor's current public API does not sign callbacks. Mission Control stores an optional callback token for future compatibility, but current callback acceptance does not enforce it.

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

Mission Control appends system execution log lines for Constructor dispatch and callbacks, including:
- dispatch accepted
- dispatch failed
- callback received
- duplicate callback ignored

These writes use the system path and do not depend on agent membership lookup.

## Current limitations

- this document describes the working local implementation, not a stable public API
- compatibility gateway routes still exist under `/api/tasks/:taskId/openclaw/*` and `/api/workspaces/current/openclaw` for the older OpenClaw bridge
- Constructor status polling currently runs from the task page while a Constructor-assigned task is `In Progress`

## Validation notes

Locally verified in this workstream:
- focused Constructor dispatch contract tests pass
- focused Constructor callback dedupe tests pass
- Prisma generate and migrate deploy pass
- Mission Control production build passes
- workspace-manageable Constructor settings are present in the UI
