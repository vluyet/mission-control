# Optimized Backlog

Snapshot date: 2026-03-16

This backlog reorders work based on the current codebase audit. It merges the remaining partial master-backlog items with the follow-up items from [backlog-additions.md](/Users/vluyet/Sites/mission-control/project/backlog-additions.md).

## Principles

- Close product-truth gaps before adding more surface area.
- Prioritize actor safety, workspace administration, and operational clarity.
- Prefer small end-to-end batches over broad partial coverage.
- Keep the app simple enough to feel like usable SaaS, not a framework demo.

## Batch 1 — Workspace administration truth

Status: `active`

1. `Workspace asset library and workspace-level files`
Priority: P1
Size: M
Status: `done`

2. `Artifact preview fallback states and unsupported-file UX`
Priority: P2
Size: XS
Status: `done`

3. `A6 follow-up — stronger global empty/error handling on workspace admin surfaces`
Priority: P2
Size: S
Status: `done`

4. `OpenClaw instance registration and agent discovery`
Priority: P1
Size: M
Status: `done`

Outcome:
- `Manage Workspace` becomes a real admin hub
- workspace context is backed by shared files, not just text
- workspace-level operational documents become visible to both humans and future agents
- OpenClaw-managed agents can be discovered into workspace members without depending on Gateway device-auth for launch

## Batch 2 — Real actor identity and access

Status: `done`

1. `Agent API credentials and scoped access`
Status: `done`
2. `Actor-attributed agent mutations`
Status: `done`
3. `Auth event trail for owner and agent access`
Status: `done`
4. `Session expiry and re-auth UX`
Status: `done`

Outcome:
- move from owner-only operation toward safe autonomous clients
- make audits trustworthy

## Batch 3 — Access and visibility enforcement

Status: `active`

1. `J6 follow-up — actor-scoped project visibility enforcement`
2. `Workspace-scoped URLs and shareable workspace state`
3. `Workspace switch consistency and hard refresh behavior` refinement

Outcome:
- workspace and project visibility become real runtime rules, not just modeled settings

## Batch 4 — Saved operational workflows

Status: `queued`

1. `Saved view sharing and default workspace views`
2. `Search shortcuts and recent queries`
3. `Quick-add task entry from list and board views`
4. `Collapsed subtask groups in list and board views`

Outcome:
- everyday task operations become faster and more repeatable

## Batch 5 — Product reliability and completeness

Status: `queued`

1. `K2 follow-up — real component tests`
2. `Attachment retention and deletion controls`
3. `Mention notifications and inbox hooks`

Outcome:
- product gets safer to evolve and cleaner in long-running use
