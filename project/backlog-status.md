# Backlog Status

Snapshot date: 2026-03-16

This file reflects the current codebase, not just previous delivery notes.

## Master backlog summary

- `79` items in the original master backlog
- `74` are implemented well enough to count as complete
- `5` are only partially implemented
- `0` are completely untouched

## Fully implemented

- `A1 — Initialize application stack`
- `A2 — Create database connection and migration workflow`
- `A3 — Create application shell layout`
- `A4 — Add authentication for a single owner user`
- `A5 — Add seeded demo data framework`
- `A7 — Add audit-friendly timestamp and ID conventions`
- `B1 — Create workspace entity and schema`
- `B2 — Build workspace list and switcher`
- `B3 — Create member entity with shared type model`
- `B4 — Add human member profile fields`
- `B5 — Add agent member profile fields`
- `B6 — Build workspace member directory`
- `C1 — Create project entity and schema`
- `C2 — Build project creation flow`
- `C3 — Build project list view`
- `C4 — Build project overview page`
- `C5 — Add project members`
- `C6 — Add project roles`
- `C7 — Add project archive state`
- `D1 — Create task entity and schema`
- `D2 — Build task creation flow`
- `D3 — Build task detail read view`
- `D4 — Build task edit flow`
- `D5 — Add task status model`
- `D6 — Add task assignee selection`
- `D7 — Add priority field`
- `D8 — Add due date and start date`
- `D9 — Add task tags`
- `D10 — Add parent/child tasks`
- `E1 — Build project task list view`
- `E2 — Build kanban board view`
- `E3 — Support drag-and-drop task movement on board`
- `E4 — Add task filters`
- `E5 — Add task sorting`
- `E6 — Add "my tasks" view`
- `E7 — Add saved views`
- `F1 — Build comments model and schema`
- `F2 — Build comment composer`
- `F3 — Build task activity timeline`
- `F4 — Auto-log key task events to activity`
- `F5 — Add comment editing`
- `F6 — Add mentions in comments`
- `F7 — Add watchers/followers`
- `G1 — Allow agent members to appear in assignee selector`
- `G2 — Add agent capability metadata`
- `G3 — Create task execution entity`
- `G4 — Create execution log entity`
- `G5 — Add execution panel on task page`
- `G6 — Create agent queue concept`
- `G7 — Add status transitions for agent workflow`
- `G8 — Add agent summary comment helper`
- `G9 — Add blocked reason capture`
- `H1 — Create attachment entity and storage contract`
- `H2 — Add file upload on task`
- `H3 — Add attachment list on task detail`
- `H4 — Add file upload by agent flow`
- `H5 — Add file preview for common types`
- `H6 — Add artifact label/type metadata`
- `I1 — Add global search for projects and tasks`
- `I2 — Add dashboard home`
- `I3 — Add overdue and due soon indicators`
- `I4 — Add review queue view`
- `I5 — Add basic activity feed by project`
- `I6 — Add completion metrics per project`
- `J1 — Add workspace roles`
- `J2 — Add project-level membership enforcement`
- `J3 — Add agent enabled/disabled switch`
- `J5 — Add allowed status transitions per actor type`
- `K1 — Add schema migration checks in CI`
- `K3 — Add activity/event test cases`
- `K4 — Add structured application logging`
- `K5 — Add database backup procedure`
- `K6 — Add seed reset workflow for local dev`

## Partially implemented

- `A6 — Add global error and empty states`
  Notes:
  There are local empty/error states and some `notFound()` handling, but there is no systematic app-wide error boundary/loading/empty-state system.

- `B7 — Add member status management`
  Notes:
  Enable/disable exists for members and agents. Archive does not exist.

- `J4 — Add simple agent permissions model`
  Notes:
  Workspace-level permissions exist and unauthorized API actions are rejected and logged. The UI does not consistently hide every forbidden action, so this is not fully complete against the original acceptance criteria.

- `J6 — Add project visibility rules`
  Notes:
  Project visibility is modeled and editable, but true per-actor visibility enforcement is not fully real because the product still runs on single-owner auth rather than distinct member identities.

- `K2 — Add component and route smoke tests`
  Notes:
  Route smoke tests exist, and activity/event tests exist. There are no actual component tests yet.

## Not implemented from the original master backlog

- None

## Backlog additions status

### Implemented

- `Context resolution service`
- `Agent API reference explorer / export`
- `DB-backed UI reads`
- `Agent API credentials and scoped access`
- `Simple task and project mutation flows`
- `Session expiry and re-auth UX`
- `Auth event trail for owner and agent access`
- `Artifact preview fallback states and unsupported-file UX`
- `Workspace switch consistency and hard refresh behavior`
- `Workspace-scoped shell counters`
- `Dashboard activity key stability and frontend warning cleanup`
- `Authenticated shell navigation cleanup`
- `Workspace asset library and workspace-level files`
- `Actor-attributed agent mutations`
- `OpenClaw instance registration and agent discovery`

### Partially implemented

### Not implemented

- `Quick-add task entry from list and board views`
- `Workspace-scoped URLs and shareable workspace state`
- `Mention notifications and inbox hooks`
- `Search shortcuts and recent queries`
- `Attachment retention and deletion controls`
- `Actor-scoped project visibility enforcement`
- `Collapsed subtask groups in list and board views`
- `Saved view sharing and default workspace views`
- `Full OpenClaw Gateway device-auth integration`
- `Scheduled OpenClaw sync and drift alerts`

## Known mapping gaps

- OpenClaw launch-safe discovery is implemented, but direct Gateway device-auth integration is still a follow-up.
- The product exposes many features, but some original backlog items remain partial around actor-scoped visibility, UI permission hiding, and component test depth.
