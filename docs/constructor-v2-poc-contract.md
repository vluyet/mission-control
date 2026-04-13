# Constructor v2 POC contract

This document describes the current local Mission Control ↔ Constructor v2 integration as implemented in this repo.

It is intentionally narrower than the older OpenClaw bridge docs. It documents the working local POC contract, not a final product API guarantee.

## Scope

Current Mission Control integration points:
- `POST /api/tasks/:taskId/constructor/dispatch`
- `GET /api/tasks/:taskId/constructor/status`
- `POST /api/tasks/:taskId/constructor/callback`

Current upstream Constructor ingress:
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/agents`
- `POST ${CONSTRUCTOR_BASE_URL}/api/v1/tasks`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:bridgeExecutionId`

Default local base URL when unset:
- `CONSTRUCTOR_BASE_URL=http://127.0.0.1:8787`

## Dispatch behavior

When an owner dispatches a task through the Constructor v2 UI card, Mission Control:
1. loads the task resource and recent comments
2. resolves `targetAgent` from the assigned Constructor agent or the synced default Constructor agent
3. builds a final-answer-oriented instruction payload for Constructor
4. generates a task-scoped callback URL back into Mission Control
5. sends a public API task request to Constructor
6. returns `202 Accepted` if Constructor accepts and persists the execution

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

Required public API fields supplied by Mission Control:
- `externalTaskId`
- `idempotencyKey`
- `targetAgent`
- `instruction`

Mission Control also sends optional execution context, metadata, callback instructions, retry policy, and timeout policy with each request.

### Important design choice

This Constructor v2 POC is intentionally different from the older OpenClaw bridge path.

Mission Control currently tells Constructor:
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

Mission Control returns `202` to the UI with the normalized dispatch payload, including the resolved `targetAgent` and whether the request was deduplicated.

## In-flight status polling

While a Constructor-assigned task is `In Progress`, Mission Control now polls Constructor's public task lookup route using the accepted `bridgeExecutionId` captured at dispatch time.

Current polling behavior:
- reads the latest Constructor execution summary from `GET /api/v1/tasks/:bridgeExecutionId`
- appends a deduplicated `CONSTRUCTOR_STATUS ...` execution log line when the upstream execution state changes
- keeps the local task in `In Progress` while Constructor reports `queued`, `dispatching`, or `running`
- promotes the task to `In Review` when Constructor reports `completed`, even before the terminal callback lands
- marks the task `Blocked` when Constructor reports `failed`, `timed_out`, or `canceled`

Terminal callbacks remain the path that writes the visible final comment into task discussion.

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

Constructor's current public API does not sign callbacks. Mission Control therefore accepts unsigned Constructor callbacks and treats any returned callback token as saved configuration only, not an enforced runtime check.

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
- dispatch accepted
- dispatch failed
- callback received
- duplicate callback ignored

For Constructor webhook/system callbacks, those log writes now use a system-level path and do not depend on finding an eligible agent membership with `log_execution`.

## Current limitations

- this doc describes the local POC contract, not a stable public API
- the dispatch route currently generates a fresh `externalTaskId` per dispatch attempt

## Validation notes

Locally verified in this workstream:
- targeted Mission Control tests pass
- Mission Control production build passes
- duplicate Constructor terminal callbacks do not create duplicate comments and still move the task to `In Review`
