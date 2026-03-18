# OpenClaw Agent Task Response Spec

Draft date: 2026-03-18

## Goal

Allow a Mission Control task assigned to an OpenClaw-backed agent to be executed through OpenClaw and produce a human-facing response back into the task comments, while keeping Mission Control as the source of truth for task state, comments, activity, and execution history.

## Current baseline

What already exists on `main`:

- owner-managed OpenClaw workspace link and agent sync
- project membership support for synced OpenClaw agents
- task dispatch for OpenClaw-backed assignees
- prompt-based Mission Control API contract for agent execution loops
- task comments, execution logs, and activity feed as distinct channels

Current dispatch implementation uses `POST /api/tasks/:taskId/openclaw/dispatch`, which then calls OpenClaw using the `/v1/responses` path and a Mission Control prompt contract.

Current feature-branch first pass replaces that outbound path with `/hooks/agent` and projects a single returned final response into task comments.

## Proposed product direction

Use OpenClaw as the execution runtime, not the task system of record.

Mission Control remains authoritative for:

- task identity
- task assignment
- task status
- comments
- execution logs
- audit activity

OpenClaw is responsible for:

- running the assigned agent
- executing the task instruction in the agent's own workspace/config context
- returning or delivering the agent result

## External execution model

Target OpenClaw hook:

- `POST /hooks/agent`

Expected request shape:

```json
{
  "agentId": "agent-sales-01",
  "message": "Review this lead, classify intent, and draft the next outreach email.",
  "wakeMode": "now",
  "deliver": false,
  "thinking": "medium",
  "timeoutSeconds": 120
}
```

Mission Control should map:

- `agentId` from the assigned OpenClaw-backed membership `sourceKey`
- `message` from a structured task payload built by Mission Control
- `wakeMode` default to `now`
- `deliver` default to `false` for the first slice so Mission Control owns result projection
- `thinking` and `timeoutSeconds` from safe defaults at first, with future workspace-level configurability

## First-pass product behavior

The first testable slice should stay narrow.

### In scope

1. Dispatch assigned OpenClaw tasks through `/hooks/agent` instead of relying on the current prompt-only `/v1/responses` path.
2. Build a concise task message from Mission Control task metadata and context hint.
3. Accept one final response synchronously from OpenClaw.
4. Write that final human-facing answer as a task comment authored by the assigned agent membership.
5. Append execution/activity trace so the dispatch remains auditable.

### Explicitly out of scope for the first slice

- generalized multi-provider runtime support
- streaming partial output into the UI
- trusted callback ingestion or signed webhook handling
- Slack/Telegram/WhatsApp channel delivery through OpenClaw
- multi-turn runtime conversation state
- automatic task status changes

## Mission Control domain rules

### Source of truth

Mission Control keeps the canonical task record. OpenClaw is only executing against it.

### Comment projection rule

Only final human-facing output should become a task comment.

Execution details and dispatch/runtime diagnostics should remain in execution logs or auth/activity events.

### Agent identity rule

When an OpenClaw response is projected into comments, it should appear as the assigned Mission Control agent membership, not as a generic runtime bot.

### Task state rule

First-slice default:

- dispatch leaves the task in its current state unless explicitly updated elsewhere
- the returned final response does not automatically move the task to `review` or `done`

## Proposed Mission Control additions

### New outbound dispatch contract

Mission Control should build a structured instruction body from:

- task id
- title
- description
- context hint
- project slug/name
- expected reporting behavior

This should become a reusable serializer instead of hard-coded prompt text embedded directly in dispatch logic.

### First-pass synchronous response handling

For this branch, Mission Control assumes OpenClaw returns one final result synchronously from `/hooks/agent`.

Mission Control should:

- verify the task still exists and is still assigned to the expected OpenClaw-backed membership before dispatch
- capture the returned response id when present
- add a human-facing comment from the assigned agent when a final response string is present
- append execution logs for dispatch and completion trace
- keep raw response payload available for future diagnostics if needed

## Open questions

These need confirmation before implementation locks:

1. Which response field from OpenClaw is the best stable correlation key for later audit screens: `id`, `runId`, or another value?
2. What exact synchronous payload shapes should Mission Control support beyond the first ones already handled?
3. When callback delivery is introduced later, what signing/auth model does OpenClaw provide?
4. Should failed runs create task comments, execution logs only, or both?

## Implemented first-pass slice on this branch

This branch now targets the smallest end-to-end loop:

1. switch dispatch to `/hooks/agent`
2. extract one final response from the synchronous payload
3. write one assigned-agent comment plus execution trace
4. keep task status unchanged
5. cover the flow with mocked OpenClaw dispatch tests

That gives a complete, testable loop without overcommitting to callbacks, streaming, or generalized orchestration.

## Acceptance criteria for the first slice

- an owner can dispatch a task assigned to an OpenClaw-backed agent through the current UI
- Mission Control sends the task to OpenClaw using `/hooks/agent` with the assigned `agentId`
- Mission Control records the outbound execution attempt in execution/activity trace
- the final synchronous response appears as a task comment authored by the assigned agent membership
- the task status is unchanged after the first-pass response projection
- regression tests cover hook dispatch and comment projection