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

- Constructor dispatch is functional through the public API with tracked `bridgeExecutionId` and `externalTaskId` state.
- Final output returns through Constructor callback and status polling, then gets projected into Mission Control comments and execution logs.
- Scoped agent credentials remain the only supported direct Mission Control API access for agent-authored actions.

