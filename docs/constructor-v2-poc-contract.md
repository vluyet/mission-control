# Constructor v2 POC contract

This document describes the current local Mission Control ↔ Constructor v2 integration as implemented in this repo.

It is intentionally narrower than the older OpenClaw bridge docs. It documents the working local POC contract, not a final product API guarantee.

## Scope

Current Mission Control integration points:
- `POST /api/tasks/:taskId/constructor/dispatch`
- `POST /api/tasks/:taskId/constructor/callback`

Current upstream Constructor ingress:
- `POST ${CONSTRUCTOR_BASE_URL}/source/mission-control/events`

Default local base URL when unset:
- `CONSTRUCTOR_BASE_URL=http://127.0.0.1:8787`

## Dispatch behavior

When an owner dispatches a task through the Constructor v2 UI card, Mission Control:
1. loads the task resource and recent comments
2. builds a compact instruction-only envelope for Constructor
3. generates a task-scoped callback URL back into Mission Control
4. sends a `task.execute` event to Constructor
5. returns `202 Accepted` if Constructor accepts and persists the execution

Current request shape sent upstream:

```json
{
  "version": "v1",
  "source": "mission-control",
  "eventType": "task.execute",
  "eventId": "evt-...",
  "idempotencyKey": "idem-...",
  "traceId": "trace-...",
  "occurredAt": "2026-04-02T20:00:00.000Z",
  "payload": {
    "externalTaskId": "mc-task-<taskId>-<timestamp>",
    "targetAgent": "main",
    "instruction": "Task: ...",
    "context": {
      "missionControl": {
        "taskId": "..."
      },
      "poc": {
        "mode": "constructor-v2",
        "expectedDelivery": "return final answer through Constructor callback so Mission Control can post the task comment"
      }
    },
    "metadata": {
      "origin": "mission-control-ui",
      "taskId": "...",
      "poc": true
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

This Constructor v2 POC is intentionally different from the older OpenClaw bridge path.

Mission Control currently tells Constructor/OpenClaw:
- do **not** call Mission Control APIs directly during execution
- do **not** post comments directly
- return only final answer text through the Constructor terminal callback

Mission Control is the writer of the final task comment in this flow.

## Accepted response handling

Mission Control currently treats the upstream Constructor response as async acceptance.

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

Mission Control returns `202` to the UI with the normalized dispatch payload.

## Callback behavior

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
- if no useful final text exists, Mission Control writes a fallback comment explaining that the callback was terminal but lacked a result payload

## Callback idempotency

Mission Control now enforces durable callback deduplication with `TaskCallbackReceipt`.

Receipt uniqueness is keyed by:
- `taskId`
- `source`
- `eventType`
- `bridgeExecutionId`

Current behavior on duplicate terminal callback retry:
- do not create a second task comment
- do not apply the task status transition a second time
- attempt to append an execution log line noting the duplicate ignore
- return `{ "ok": true, "duplicate": true }`

This was regression-tested locally with:
- `app/tests/constructor-callback-dedupe.test.mjs`

## Logging behavior

Mission Control appends execution log lines for:
- callback received
- duplicate callback ignored

For Constructor webhook/system callbacks, those log writes now use a system-level path and do not depend on finding an eligible agent membership with `log_execution`.

## Current limitations

- this doc describes the local POC contract, not a stable public API
- the dispatch route currently generates a fresh `externalTaskId` per dispatch attempt
- callback authentication/signing is not implemented here yet
- in-flight polling against Constructor admin APIs is not wired into the Mission Control UI yet

## Validation notes

Locally verified in this workstream:
- targeted Mission Control tests pass
- Mission Control production build passes
- duplicate Constructor terminal callbacks do not create duplicate comments and still move the task to `In Review`
