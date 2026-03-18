# Sprint Now

## Active batch

Source of truth: `project/BACKLOG.md`

In progress:
1. Actor-scoped project visibility enforcement
2. Workspace-scoped URLs and shareable workspace state
3. Workspace switch consistency + hard-refresh safety

## Delivery rules

- Keep Docker-first workflow.
- Keep API-first contract for autonomous agents.
- Ship small coherent batches that close product-truth gaps first.
- Do not expand UI surface before runtime correctness and auditability.

## Notes

- OpenClaw autonomous loop is functional via scoped runtime bearer credentials.
- Dispatch is hooks-based (`/hooks/agent`) with ack/runId semantics.
- Agent progress/final output should flow via Mission Control APIs:
  - `POST /api/tasks/:taskId/execution`
  - `POST /api/tasks/:taskId/comments`

