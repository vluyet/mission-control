# Constructor v2 POC contract

This document describes the current local Mission Control ↔ Constructor v2 integration as implemented in this repo.

It is intentionally narrower than the older bridge-era docs. It documents the working local POC contract, not a final product API guarantee.

## Scope

Current Mission Control integration points:
- `GET /api/workspaces/current/constructor/capabilities`
- `POST /api/tasks/:taskId/constructor/dispatch`
- `GET /api/tasks/:taskId/constructor/status`
- `POST /api/tasks/:taskId/constructor/callback`
- `GET /api/tasks/:taskId/constructor/files`
- `POST /api/tasks/:taskId/constructor/files`
- `DELETE /api/tasks/:taskId/constructor/files/:fileId`
- `GET /api/tasks/:taskId/constructor/files/:fileId/download`

Current upstream Constructor ingress:
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/agents`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/capabilities`
- `POST ${CONSTRUCTOR_BASE_URL}/api/v1/tasks`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:bridgeExecutionId`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/by-external/:externalTaskId`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:externalTaskId/files`
- `POST ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:externalTaskId/files`
- `DELETE ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:externalTaskId/files/:fileId`
- `GET ${CONSTRUCTOR_BASE_URL}/api/v1/tasks/:externalTaskId/files/:fileId/download`

Default local base URL when unset:
- `CONSTRUCTOR_BASE_URL=http://127.0.0.1:8787`

## Dispatch behavior

When an owner dispatches a task through the Constructor v2 UI card, Mission Control:
1. loads the task resource and recent comments
2. resolves `targetAgent` from the assigned Constructor agent or the synced default Constructor agent
3. builds a final-answer-oriented instruction payload for Constructor
4. derives one stable Constructor task scope from the Mission Control task id
5. generates a fresh idempotency key for the intentional dispatch attempt
6. generates a task-scoped callback URL back into Mission Control
7. sends a public API task request to Constructor
8. returns `202 Accepted` if Constructor accepts and persists the execution

Current request shape sent upstream:

```json
{
  "externalTaskId": "mc-task-<taskId>",
  "idempotencyKey": "mc-task-<taskId>-dispatch-<uuid>",
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

Stable task scope behavior:
- `externalTaskId` is now deterministic per Mission Control task and is reused across reruns
- `idempotencyKey` is fresh for each intentional new dispatch attempt
- comment-mention follow-up dispatches still use their own explicit comment-scoped ids

### Important design choice

This Constructor v2 POC is intentionally different from the older bridge-era task execution path.

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

## Task-scoped files

Mission Control now proxies Constructor task files through its own task namespace instead of exposing Constructor credentials in the browser.

Current Mission Control file behavior:
- resolves Constructor credentials from the task workspace on the server
- uses the stable task `externalTaskId` as the Constructor file scope
- lists files on demand from Constructor instead of mirroring them locally
- shows an attachment-style task UI for active reusable inputs on Constructor-assigned tasks
- refreshes and caches Constructor task-file capabilities server-side so the upload limit can be reused between interactions
- shows the current human-readable upload limit before task-file upload and rejects obviously too-large files client-side
- keeps native Mission Control attachments unchanged, but hides them on Constructor-assigned task detail in this pass

Current UI/route behavior:
- `GET /api/workspaces/current/constructor/capabilities` refreshes the authenticated Constructor capability snapshot, including `taskFiles.uploadMaxBytes`
- `GET /api/tasks/:taskId/constructor/files` returns either a ready file list or a normalized disabled / not-configured state for the UI
- `POST /api/tasks/:taskId/constructor/files` accepts JSON with `fileName`, `contentBase64`, and optional `contentType`
- `DELETE /api/tasks/:taskId/constructor/files/:fileId` removes an input from future runs through Constructor soft-deactivation
- `GET /api/tasks/:taskId/constructor/files/:fileId/download` streams the Constructor file download through Mission Control
- oversized uploads are blocked before encoding when the cached max-size limit is present, and upstream `413` responses are still surfaced cleanly if the limit changed or the client-side check was bypassed

First-pass limitations of this file surface:
- Mission Control does not mirror Constructor task files into Postgres
- generated outputs remain read-only in Mission Control and are not yet rendered in the simplified attachment-style task UI
- removing an input affects future runs only and does not remove historical outputs

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
- the file list normalization is intentionally defensive because Constructor file payload fields are still newer and less rigidly documented than the task dispatch contract

## Validation notes

Locally verified in this workstream:
- targeted Mission Control tests pass
- Mission Control production build passes
- duplicate Constructor terminal callbacks do not create duplicate comments and still move the task to `In Review`
