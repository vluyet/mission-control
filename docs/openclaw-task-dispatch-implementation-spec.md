# Gateway Task Dispatch Compatibility Spec

## Objective
Document the retained gateway-backed task dispatch compatibility path while Constructor remains the intended Mission Control product flow.

## Product requirements

### Dispatch UX
- Any retained compatibility trigger for gateway-backed dispatch must show feedback immediately.
- The trigger must enter a sending state (`Dispatching...`) and avoid duplicate clicks.
- On acceptance, the user must see a clear confirmation message without waiting for the task to finish.
- If the task is already active, the compatibility trigger should be disabled and explain that gateway-backed work is already running.

### Backend behavior
- Dispatch is asynchronous by contract.
- Dispatch success must not depend on immediate final text from the gateway-backed agent run.
- Backend must return `202 Accepted` once the gateway-backed run is accepted.
- On acceptance, the task must be persisted as `in_progress` immediately.
- On completion, the task must move to `review`.
- On blocked runs, task should move to `blocked` when explicitly reported.

### Transparency
- The task page must expose a dedicated execution activity area for the retained compatibility flow.
- Activity area must show:
  - current agent state (`Idle`, `Live`, `Blocked`, `Completed`)
  - freshness of latest update
  - latest execution message
  - recent execution milestones
- Execution logs are operator visibility, not chain-of-thought.
- Final user-facing output belongs in task comments.

### Live update behavior
- While an OpenClaw-assigned task is `in_progress` or `blocked`, the task page should auto-refresh on a lightweight cadence.
- Suggested cadence:
  - immediate refresh on mount
  - a short follow-up refresh ~1.5s later
  - then every ~5s while active
- Refresh stops automatically once task leaves active state.
- Keep polling limited to active task detail pages only; do not globally poll list screens.

### Token / cost discipline
- Progress updates should be milestone-based, not continuous narration.
- Typical target: 2-6 execution entries per task.
- Avoid prompting OpenClaw to emit redundant progress noise.
- Prefer server-side route revalidation + active-page refresh over broad real-time infrastructure unless truly needed.

## API contract

### Dispatch endpoint
`POST /api/tasks/:taskId/openclaw/dispatch`

This route is a compatibility bridge. Constructor-owned dispatch should use `POST /api/tasks/:taskId/constructor/dispatch`.

Success:
- HTTP `202`
- payload includes `accepted`, `responseId`, optional `message`

Effects on success:
- task status => `in_progress`
- execution log created for dispatch/acceptance
- relevant task/project/list routes revalidated

### Webhook endpoint
`POST /api/tasks/:taskId/openclaw/webhook`

This route is a compatibility bridge for the older gateway-backed dispatch path.

Supported event intents:
- `progress`
- `blocked`
- `completed`
- `failed`

Effects:
- progress => append execution log, keep `in_progress`
- blocked => append execution log, set `blocked`
- completed => append final comment, set `review`
- failed => append execution log, keep transparent failure reason

## UI states

### Dispatch button states
- Idle: compatibility-trigger specific
- Sending: `Dispatching...`
- Active/locked: gateway-backed run active

### Inline dispatch messages
- Sending: gateway-backed dispatch in progress
- Accepted: task dispatched and marked in progress
- Running: task is already in progress
- Failure: backend-provided error text when available

## Acceptance criteria
- Clicking dispatch gives instant visual feedback.
- Accepted dispatch updates task status to `in_progress` without waiting for completion.
- Task detail view visibly refreshes while OpenClaw is active.
- OpenClaw activity panel shows recent progress with freshness indicator.
- Final result appears in comments and task ends in `review`.
- Duplicate dispatch while already active is prevented in UI.

## Implementation notes
- Use route revalidation for task detail + relevant project/task list pages.
- Use client-side refresh loop only on active task detail pages.
- Avoid websockets/SSE until lightweight polling proves insufficient.
- Keep OpenClaw prompts concise and explicit about status/progress/final reporting.
