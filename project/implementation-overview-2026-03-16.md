# Implementation Overview

Audit date: 2026-03-16

This is a codebase-level overview of what exists today across UI, API, data, and operations.

## What the app currently is

The product is a Docker-run Next.js + Prisma + Postgres task-management SaaS skeleton with:

- owner authentication
- scoped agent bearer credentials
- workspace-level OpenClaw instance registration and agent sync
- multiple workspaces
- projects inside workspaces
- tasks inside projects
- mixed human and agent members
- comments, activity, watchers, attachments, and execution logs
- agent-oriented API docs and machine-readable contract export

It is no longer a pure mock. It has real DB-backed reads and writes for the core task system.

## Product surfaces currently implemented

### Workspace-level

- sign-in
- workspace dashboard home
- workspace switcher
- workspace member directory
- manage workspace
- workspace shared documents
- global search
- activity feed
- queue view
- my tasks view
- agent docs page

### Project-level

- project list
- project creation
- project overview
- project member management
- project governance controls
- project task creation

### Task-level

- task detail page
- task editing
- task comments
- task activity timeline
- task execution panel
- task watchers
- task attachments
- task parent/child relationships

## API surfaces currently implemented

### Auth

- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`

### Workspaces

- `GET /api/workspaces/active`
- `GET /api/workspaces/current`
- `PATCH /api/workspaces/current`
- `GET /api/workspaces/current/openclaw`
- `PATCH /api/workspaces/current/openclaw`
- `POST /api/workspaces/current/openclaw/sync`
- `GET /api/workspaces/default/context`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[slug]`
- `PATCH /api/projects/[slug]`
- `GET /api/projects/[slug]/context`
- `GET /api/projects/[slug]/members`
- `PATCH /api/projects/[slug]/members`
- `POST /api/projects/[slug]/tasks`

### Tasks

- `GET /api/tasks/[taskId]`
- `PATCH /api/tasks/[taskId]`
- `GET /api/tasks/[taskId]/context`
- `GET /api/tasks/[taskId]/activity`
- `GET /api/tasks/[taskId]/comments`
- `POST /api/tasks/[taskId]/comments`
- `PATCH /api/tasks/[taskId]/comments/[commentId]`
- `GET /api/tasks/[taskId]/execution`
- `POST /api/tasks/[taskId]/execution`
- `GET /api/tasks/[taskId]/attachments`
- `POST /api/tasks/[taskId]/attachments`
- `GET /api/tasks/[taskId]/watchers`
- `PATCH /api/tasks/[taskId]/watchers`

### Members

- `PATCH /api/members/[memberId]`

### Attachments

- `GET /api/attachments/[attachmentId]`
- `GET /api/attachments/[attachmentId]/preview`

### Search and docs

- `GET /api/search`
- `GET /api/docs/agents`
- `GET /api/docs/agents/contract`

## Data model currently implemented

Prisma schema currently includes:

- `User`
- `Workspace`
- `Membership`
- `WorkspaceOpenClawIntegration`
- `Project`
- `ProjectMembership`
- `Task`
- `TaskWatcher`
- `Comment`
- `TaskActivity`
- `TaskExecution`
- `TaskExecutionLog`
- `Attachment`

The schema supports:

- workspace visibility
- member kind and workspace role
- externally sourced agent mappings for OpenClaw-discovered members
- agent capability labels and permission arrays
- project visibility, status, and membership roles
- parent/child task hierarchy
- task assignment and reviewer links
- attachment metadata
- execution logs separate from comments

## What is fully real versus what is still lightweight

### Fully real

- DB-backed CRUD for core project/task/member operations
- task activity logging for core writes
- task-level attachments on local Docker storage
- workspace-level shared files on local Docker storage
- OpenClaw agent discovery through registered config-file or CLI integrations
- agent workflow status transitions
- project membership assignment rules
- owner auth and protected routes
- bearer-authenticated scoped agent API access

### Lightweight by design

- saved views are local browser state
- search is simple workspace-scoped query, not a command palette
- auth is single-owner only
- preview support is basic
- board drag-and-drop is optimistic and simple
- workspace switching is preference-based, not URL-scoped
- OpenClaw discovery is launch-safe and explicit, not yet a full native Gateway client

## Where the mapping is incomplete today

These are the biggest places where the product model and the product UI are not yet mapped cleanly enough.

### 1. Workspace administration is still incomplete

Implemented:
- workspace settings and context editing
- workspace shared files and references
- workspace member and project counts

Missing:
- richer workspace asset management beyond basic upload/list/preview/download
- workspace-level file lifecycle controls
- stronger workspace-level access rules for shared assets
- scheduled OpenClaw sync and full Gateway device-auth support

Workspace context is now backed by shared workspace documents, but the library is still lightweight rather than fully governed.

### 2. Member identity is modeled better than it is authenticated

Implemented:
- human and agent members
- workspace roles
- project roles
- agent permissions
- scoped agent bearer credentials
- owner and agent auth-event trail

Missing:
- real per-member sign-in
- actor-scoped visibility enforcement

Today the app supports real autonomous agent API access, but the browser product is still effectively owner-operated.

### 3. Governance is present in data, but not fully enforced by identity

Implemented:
- project visibility setting
- project role assignment
- observer/viewer ownership restrictions

Missing:
- true hiding of projects based on who is acting
- member-scoped read restrictions

### 4. Quality/reliability coverage is useful but not broad

Implemented:
- migration check script
- smoke route tests
- activity event tests
- structured logging
- backup procedure doc

Missing:
- component tests
- broader UI interaction tests
- stronger end-to-end regression coverage

## Recommended “truthful” status interpretation

If you want the honest product read:

- core task management: implemented
- core project management: implemented
- core workspace management: implemented, but still thin
- agent operations: implemented at a useful alpha level
- governance and permissions: partially real, not fully identity-backed
- workspace administration beyond settings: incomplete
- quality infrastructure: present, but not mature

## Best next work if you want the product map to feel complete

1. `Actor-scoped project visibility enforcement`
2. `Workspace-scoped URLs and shareable workspace state`
3. `Saved view sharing and default workspace views`
4. `Attachment retention and deletion controls`
5. `K2 follow-up — real component tests`

Those five would close the biggest “it exists in concept but not fully in product” gaps.
