# Mission Control OpenClaw Bridge

This bridge is the single entrypoint between Mission Control and OpenClaw when bridge mode is enabled.

## Goals

- Discover and sync agents through the bridge
- Dispatch tasks through the bridge
- Redispatch `@agent` comment mentions through the bridge
- Keep Mission Control as the system that receives final/progress callbacks and writes comments/status updates
- Produce a strong debug trail for every bridge hop

## HTTP surface

### `GET /health`
Returns bridge health, upstream OpenClaw URL, and log path.

### `GET /agents`
Returns the available OpenClaw agents.

Primary path:
- calls OpenClaw `POST /tools/invoke` with `{ "tool": "agents_list", "args": {} }`

Supplemental path:
- also calls `openclaw gateway call sessions.list --params '{}'`
- derives agent IDs from `agent:<id>:` session keys
- returns the union of both sources so session-discovered agents are not lost when the primary list is incomplete

### `POST /dispatch`
Dispatches a task to a specific agent through the bridge.

Request body:

```json
{
  "agentId": "nova",
  "taskId": "task_123",
  "workspaceId": "ws_123",
  "prompt": "Do the work",
  "webhookUrl": "https://mission-control.example/api/tasks/task_123/openclaw/webhook",
  "webhookToken": "..."
}
```

Bridge behavior:
1. log incoming dispatch request
2. forward to OpenClaw `/hooks/agent`
3. if needed, fall back to OpenClaw `/v1/responses`
4. if needed, fall back again to `openclaw agent --agent <id> --message ... --json`
5. return accepted response metadata to Mission Control

### `POST /workspace-dispatch`
Dispatches via a workspace → agent bridge link.

### `POST /workspace-links`
Creates an in-memory workspace → agent link.

### `GET /workspace-links`
Shows current in-memory workspace → agent links.

### `GET /logs/recent`
Returns the last bridge log entries.

## Logging

The bridge appends JSONL records to:

- `MC_OPENCLAW_BRIDGE_LOG_PATH`
- default: `/tmp/mc-openclaw-bridge.log`

Examples:

```json
{"ts":"2026-03-27T07:00:00+00:00","event":"bridge.dispatch.request","agentId":"nova","taskId":"task_123"}
{"ts":"2026-03-27T07:00:01+00:00","event":"openclaw.request","path":"/hooks/agent","mode":"hook"}
{"ts":"2026-03-27T07:00:01+00:00","event":"openclaw.response","responseId":"resp_123","hasFinalText":false}
{"ts":"2026-03-27T07:00:01+00:00","event":"bridge.dispatch.accepted","agentId":"nova","taskId":"task_123","responseId":"resp_123"}
```

## Mission Control flow

Mission Control now uses the bridge for:

1. **Discover and sync agents**
   - app calls bridge `GET /agents`
   - returned agents are synced into workspace memberships

2. **Task dispatch**
   - app calls bridge `POST /dispatch`
   - bridge forwards to OpenClaw
   - bridge returns acceptance metadata
   - OpenClaw later calls Mission Control webhook directly

3. **Comment mention redispatch**
   - user posts comment like `@Nova please revise`
   - Mission Control resolves the mentioned agent
   - Mission Control redispatches through bridge `POST /dispatch`
   - OpenClaw later posts progress/final state back to Mission Control webhook

## Why this helps debugging

With this setup, the bridge becomes the single place to inspect:

- what Mission Control sent
- which upstream path was used
- whether fallback was used
- acceptance IDs returned by OpenClaw
- whether final text was sync or async

This makes end-to-end debugging much easier than mixing direct app → OpenClaw traffic with bridge traffic.
