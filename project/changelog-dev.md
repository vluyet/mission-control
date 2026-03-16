# Dev Changelog

## 2026-03-16

### Launch cleanup batch: empty workspace seed

- Removed seeded operational demo data from the database reset flow.
- Replaced the seed with a single owner-linked empty workspace, no projects, no tasks, no agents, no comments, no activity, and no sample files.
- Updated the main workspace surfaces so launch state is intentionally empty:
  - workspace home
  - projects
  - my tasks
  - queue
  - activity
- Added or improved empty-state messaging for task lists, project snapshots, activity, boards, and workspace files.
- Replaced hardcoded seeded task links and seeded actor names with launch-safe defaults.
- Removed remaining product-facing "demo mode" wording from the API/docs layer.

### Redesign batch: premium product UI overhaul

- Replaced the initial prototype shell with a structured product shell featuring:
  - dark operational sidebar
  - cleaner command/top bar
  - stronger page framing
  - layered work surfaces
- Introduced a reusable UI pattern layer for panels, section headers, badges, chips, buttons, and segmented tabs.
- Rebuilt the homepage as a product-grade workspace with:
  - overview strip
  - refined task list module
  - premium kanban board module
  - multi-region task detail workspace
- Added a redesigned `/sign-in` screen aligned with the same product system.
- Tightened spacing, density, border logic, metadata treatment, and interaction states across the app.
- Verified the redesign through Docker with a successful production build.

### Core product build batch: routed workspace surfaces

- Expanded the active sprint into a broader backlog-aligned UI batch covering:
  - dashboard home
  - projects list
  - project overview/workspace
  - task detail routes
  - my tasks
  - members directory
  - activity
  - agent queue
- Replaced the single demo surface with a routed product shell using shared workspace navigation.
- Added richer seeded demo data for:
  - projects
  - members
  - tasks
  - comments
  - activity
  - execution feeds
- Reworked the visual system to use more width and less shadow:
  - flatter panels
  - cleaner borders
  - wider content framing
  - tighter operational density
- Kept the sign-in screen visually aligned with the wider product system.
- Added an explicit API-first implementation principle to the active sprint so autonomous agent usage and future documentation remain part of the product architecture.
- Verified the expanded app via Docker rebuild and successful production build.

### Context and agent-docs batch

- Added explicit workspace context and project context modeling to the seeded app data.
- Added task-level resolved context so tasks clearly inherit both workspace and project framing.
- Exposed context in the UI on:
  - dashboard
  - project workspace
  - task detail
- Added `/docs/agents` as the first product-facing agent integration and API contract page.
- Added route-level verification for key pages from inside the Docker app container.

### API-first demo contract batch

- Added live demo-mode API routes for:
  - workspace context
  - project context
  - task detail with resolved context
  - task comments
  - task activity
  - task execution logs
  - agent docs contract
- Added shared JSON response helpers and API contract builders.
- Added demo-mode write endpoints for posting task comments and execution log lines.
- Verified API reads and writes from inside the Docker app container.

### Backend consolidation batch

- Extended Prisma schema with:
  - workspace context
  - project context
  - richer task metadata
  - comments
  - task activity
  - task executions
  - task execution logs
- Added a second migration for context, comments, activity, executions, and logs.
- Added Docker-friendly seed and reset workflow with `db:seed` and `db:reset`.
- Switched the demo API routes to seeded PostgreSQL data via Prisma.
- Added `project/backlog-additions.md` to track follow-up work for context resolution, agent API discoverability, and DB-backed UI reads.

### Context resolution and agent contract export batch

- Added a shared task context resolver so workspace context, project context, and task-specific hints resolve through one deterministic service.
- Updated demo UI helpers and DB-backed task reads to use the same context resolution model.
- Added `GET /api/tasks/:taskId/context` as a dedicated API resource for orchestration and context-only reads.
- Expanded agent docs with exportable contract routes:
  - `/api/docs/agents`
  - `/api/docs/agents/contract`
- Updated the product-facing agent docs page to advertise machine-readable exports directly in the UI.
- Extended the active sprint to include context resolution and contract export as explicit backend deliverables.
- Added a new follow-up backlog item for scoped agent API credentials and access control.

### DB-backed routed UI read batch

- Moved the main routed workspace surfaces off static demo reads and onto seeded PostgreSQL reads via Prisma:
  - dashboard
  - projects list
  - project workspace
  - standalone task detail
  - project task detail
  - members
  - my tasks
  - agent queue
  - activity
- Added UI-facing Prisma mappers in `server-data.ts` so the product components can keep their current composition while reading persistent data.
- Added computed workspace dashboard metrics, board columns, activity feed items, project summaries, and member directory records from the database.
- Updated the activity panel to accept dynamic feed items instead of only bundled demo data.
- Added a new backlog follow-up for simple task and project mutation flows so the app can move from read-first product shell toward a working SaaS.

### Simple mutation batch

- Added a backlog inspection artifact at `project/backlog-status.md` to record what is completed, partial, and still untouched from the master backlog.
- Moved the active sprint into the first simple mutation batch:
  - project creation
  - task editing
  - real comment posting from the task UI
- Added `POST /api/projects` for compact project creation in the default workspace.
- Added `PATCH /api/tasks/:taskId` for updating core task metadata.
- Added product-native write surfaces:
  - `/projects/new`
  - `/tasks/[taskId]/edit`
- Replaced the placeholder task comment textarea with a working comment composer that posts to the live API and refreshes the task surface.
- Updated task and project surfaces so working flows are linked from the UI instead of leaving key actions as dead buttons.
- Extended the agent docs and contract references to include the new mutation endpoints.
- Verified project creation, task updates, and comment posting through Docker, along with the new routed form pages.

### Project membership and task creation batch

- Added `ProjectMembership` to the Prisma schema with a dedicated migration and updated seed data so projects now have an explicit member scope.
- Added project-member management through:
  - `/projects/[slug]/members`
  - `GET /api/projects/[slug]/members`
  - `PUT /api/projects/[slug]/members`
- Added project-scoped task creation through:
  - `/projects/[slug]/tasks/new`
  - `POST /api/projects/[slug]/tasks`
- Updated task editing so assignee options come only from the project member set instead of all workspace members.
- Added project-level assignment enforcement in the server layer so invalid assignees are rejected by API writes.
- Updated project surfaces to link directly into member management and task creation.
- Extended agent docs and the machine-readable contract to include project-member and task-create endpoints.
- Added a follow-up backlog idea for quick-add task entry from list and board surfaces.
- Verified the migration, seed, build, routed pages, valid task creation, and invalid-assignee rejection through Docker.

### Owner auth batch

- Added environment-backed owner authentication with signed session cookies in `app/src/lib/auth.ts`.
- Added authenticated API endpoints for session lifecycle:
  - `POST /api/auth/sign-in`
  - `POST /api/auth/sign-out`
- Added middleware-based protection for workspace routes and non-public API routes.
- Upgraded the sign-in screen from a static surface to a working product-auth flow with:
  - inline error handling
  - remember-device control
  - redirect-aware continuation back to protected routes
- Added sign-out control directly in the product shell.
- Documented owner auth variables in `.env.example`.
- Verified the batch through Docker with a successful production build plus anonymous and authenticated route/API checks.

### Workspace switcher, member profiles, and runtime stability batch

- Fixed the broken UI loading issue caused by shared dev and production `.next` output in Docker:
  - dev now uses `.next-dev`
  - production build keeps using `.next`
- Added an active-workspace switcher in the shell backed by a cookie preference and `POST /api/workspaces/active`.
- Extended seeded data with a second workspace, its own members, projects, tasks, activity, comments, and execution logs so workspace switching changes the actual product surfaces.
- Updated DB-backed UI reads to honor the active workspace across:
  - dashboard
  - projects
  - members
  - activity
  - task lists
  - project surfaces
- Completed the human profile story by seeding and rendering avatar data in the member directory.
- Rebuilt the member directory into a stronger operational roster with grouped human and agent sections, richer identity panels, and clearer load/contact presentation.
- Verified the runtime fix by checking live `_next` assets return `200` and by switching workspaces through the authenticated API and confirming the routed pages change accordingly.

### Task-view control batch

- Added practical task-view filters and sorting controls to the main routed work surfaces:
  - project task list
  - my tasks
  - queues
- Added server-rendered task-view query parsing and application helpers for:
  - status
  - timing
  - tag
  - sort order
- Reframed `/queue` into a dual-purpose queue surface with:
  - review queue
  - agent queue
- Updated task records with raw timestamp metadata so sorting and due-state filtering remain accurate while preserving the existing presentation model.
- Verified the batch through Docker with a successful production build and live route checks against the new queue and filtered task surfaces.

### Agent workflow control batch

- Added a new member mutation endpoint at `PATCH /api/members/:memberId` for enabling and disabling agent members.
- Enforced safer agent assignment rules:
  - disabled agents can no longer be assigned to tasks
  - disabling an agent clears active assignment and review references
- Added constrained workflow transitions for agent-owned tasks in the task update API.
- Exposed agent capability metadata more clearly in:
  - member directory cards
  - task property rail
- Added product UI controls for:
  - enabling and disabling agents from the member roster
  - moving agent-owned tasks through the allowed workflow on task detail pages
- Updated agent docs and API contract references to include the new member-control and agent-workflow semantics.
- Verified the batch through Docker with:
  - successful production build
  - disabled-agent assignment rejection
  - invalid agent transition rejection
  - valid agent transition acceptance
  - routed UI checks on members and task detail

### Agent permissions, watchers, and review-output batch

- Extended the Prisma schema and seed data with:
  - workspace-level agent permissions
  - task watchers/followers
- Added live API support for:
  - `PATCH /api/members/:memberId` with `agentPermissions`
  - `GET /api/tasks/:taskId/watchers`
  - `PUT /api/tasks/:taskId/watchers`
- Enforced agent permissions for:
  - human-facing agent comments
  - machine-facing execution log writes
  - agent-owned status transitions
- Added automatic human-readable summary comments when an agent-owned task reaches `done` and the assigned agent has comment permission.
- Wired the product UI so:
  - agent cards expose editable permission chips
  - task detail shows watcher management in the right rail
  - task detail shows agent action-policy chips alongside capability fit
- Updated the product-facing agent docs and contract exports to reflect watcher resources, permission semantics, and summary-comment behavior.
- Verified the batch through Docker with:
  - successful database reset and reseed
  - successful production build
  - denied execution logging when `log_execution` permission is removed
  - denied agent status transition when `change_status` permission is removed
  - successful watcher updates
  - successful auto-generated summary comment on agent completion

### Comment editing and mentions batch

- Added `PATCH /api/tasks/:taskId/comments/:commentId` for editing existing human comments.
- Extended comment mapping so edited comments expose `editedAt` and can be rendered with a visible edited state.
- Rebuilt the task discussion module as a more complete collaboration surface with:
  - inline comment editing
  - lightweight `@Name` mention insertion chips
  - mention highlighting in rendered comments
- Kept mention support intentionally simple and body-based so the product gains collaboration utility without adding a heavy notification system yet.
- Updated agent docs and contract references to include comment editing and mention-compatible comment bodies.

### Artifact preview and project metrics batch

- Completed agent-attributed attachment uploads on top of the existing task file system:
  - attachment uploads now accept an `actorType`
  - enabled assigned agents can upload generated outputs as task artifacts
- Added inline preview support for common file types through `GET /api/attachments/:attachmentId/preview`:
  - images
  - pdf
  - text and markdown
  - json and xml
- Updated the task file panel so users can:
  - choose whether an upload is human- or agent-attributed
  - preview supported artifacts inline without leaving task detail
- Added simple completion metrics onto project summary cards so project progress is visible without introducing heavyweight reporting.
- Updated the product-facing agent docs and machine-readable API contract to include preview and agent-upload semantics.

### Project governance batch

- Extended the project model with explicit governance primitives:
  - project roles on memberships: lead, member, observer
  - project visibility: workspace or project_members
  - archive state surfaced as active or archived
- Added project governance API support through:
  - `PATCH /api/projects/:slug`
  - richer `GET /api/projects/:slug/members`
  - richer `PUT /api/projects/:slug/members` with role mapping
- Reworked the project access screen so it now manages:
  - member scope
  - project roles
  - visibility
  - archive lifecycle
- Enforced simple but useful rules in the server layer:
  - observer project members cannot own tasks
  - archived projects reject new task creation
  - archived projects fall out of the default active project list
- Updated project list and project overview surfaces to show lifecycle and visibility state more clearly.
- Updated the agent docs and contract bundle so autonomous clients can understand project governance resources and constraints.

### Task structure and board movement batch

- Extended the task model with parent-child relationships through `parentTaskId`.
- Added simple task structure support to the product:
  - parent task selection on create and edit
  - child task visibility on task detail
  - parent/subtask cues in task lists and board cards
- Upgraded task forms so tags are now editable through the product instead of only appearing in seeded data.
- Added native drag-and-drop board movement backed by the existing task update API with optimistic UI and refresh-on-success behavior.
- Expanded the seeded data so a few tasks now demonstrate real parent-child structure.
- Updated the agent docs and contract examples to include tag and parent-task payloads.

### Reliability and saved-views batch

- Added lightweight saved task views on top of the existing filter model for:
  - project task views
  - my tasks
  - review and agent queues
- Added Docker-native CI workflow at `.github/workflows/ci.yml` covering:
  - migration validation
  - smoke tests
  - activity/event tests
  - production build
- Added Node built-in test coverage without introducing a heavy test framework:
  - `tests/smoke-routes.test.mjs`
  - `tests/activity-events.test.mjs`
- Added structured JSON application logging via `src/lib/logger.ts` and wired it into core mutation routes.
- Documented Docker-native database backup and restore steps in `project/backup-procedure.md`.
- Completed the remaining items from the original master backlog, with future work now tracked only in `project/backlog-additions.md`.
- Verified the batch through Docker with:
  - successful production build
  - successful live comment edit API check
  - preserved mention text and edited timestamp
  - successful task detail route rendering after the collaboration changes

### Workspace roles, actor transitions, and search batch

- Added `WorkspaceRole` to the Prisma schema and seeded members with simple owner/admin/member/viewer roles.
- Added member role editing through the existing member mutation endpoint so workspace roles are now visible and adjustable in the product.
- Enforced a lightweight role rule:
  - viewer-role members remain visible in the system
  - viewer-role members cannot own or review tasks
- Expanded task workflow logic so status transitions are now actor-aware:
  - human transitions use an explicit human policy
  - agent transitions continue using the stricter agent policy plus permission checks
- Extended the task update API with `actorType` so autonomous clients can declare whether a transition is human- or agent-driven.
- Added global search across projects and tasks through:
  - `GET /api/search?q=...`
  - `/search?q=...`
  - shell-integrated global search input
- Updated task and member product surfaces so the new rules are visible:
  - workspace role controls in the member directory
  - human workflow actions on task detail
  - clearer role-aware assignment messaging in task forms
- Updated agent docs and contract exports for:
  - workspace role updates
  - actor-type transition semantics
  - active-workspace search
- Verified the batch through Docker with:
  - successful database reset and reseed
  - successful production build
  - successful `/api/search` and `/search` checks
  - viewer-role assignment rejection
  - invalid human transition rejection
  - valid human transition acceptance

### Attachment foundation batch

- Added attachment persistence to the Prisma schema with a Docker-local storage contract:
  - attachment metadata in Postgres
  - binary file storage under the app workspace
- Added live attachment APIs:
  - `GET /api/tasks/:taskId/attachments`
  - `POST /api/tasks/:taskId/attachments`
  - `GET /api/attachments/:attachmentId`
- Added seeded sample attachments so the task detail surface demonstrates real file behavior after reset.
- Extended task detail with a files panel that supports:
  - attachment listing
  - artifact-type labeling
  - direct file upload
  - direct download links
- Added activity logging for attachment uploads so files remain part of the task audit trail.
- Updated the agent docs and contract exports to include attachment resources and the local storage semantics.
- Verified the batch through Docker with:
  - successful database reset and reseed
  - successful production build
  - successful seeded attachment download
  - successful live file upload through the attachment API
  - successful task detail rendering with attachments present

### Shell polish pass

- Reworked the authenticated product shell to give the main content more space and clearer framing:
  - fixed, narrower sidebar
  - dedicated sticky topbar for search, session context, notifications, sign-out, and quick task access
  - cleaner navigation grouping for core work versus operations
- Tightened workspace navigation with a single dropdown selector and workspace-scoped shell counts.
- Improved workspace switching behavior so route handling follows context more safely instead of leaving stale task or project screens in place.
- Removed contradictory authenticated navigation by hiding the signed-in `Sign In` rail item.
- Fixed dashboard activity row key stability to eliminate the duplicate React-key warning found in browser QA.
- Added a real app icon to stop the missing favicon request in the browser console.

### Workspace assets batch

- Added an optimized follow-up backlog in [project/backlog-optimized.md](/Users/vluyet/Sites/mission-control/project/backlog-optimized.md) and moved `project/sprint-now.md` to the first new batch.
- Added workspace-level shared files as first-class records in Prisma:
  - new `WorkspaceAsset` model
  - migration `202603160009_workspace_assets`
- Extended Docker-local storage to support workspace assets alongside task attachments.
- Seeded example workspace documents so the admin surface demonstrates real shared-file behavior after reset.
- Added workspace asset APIs:
  - `GET /api/workspaces/current/assets`
  - `POST /api/workspaces/current/assets`
  - `GET /api/workspace-assets/:assetId`
  - `GET /api/workspace-assets/:assetId/preview`
- Extended `Manage Workspace` with a real shared-documents panel:
  - list
  - preview where supported
  - download
  - upload
- Updated project tracking docs so the implementation overview and backlog status reflect that workspace-level files now exist.
- Verified the batch through Docker with:
  - successful database reset and reseed
  - successful production build
  - successful authenticated `Manage Workspace` render
  - successful workspace asset listing
  - successful workspace asset download and preview

### Workspace admin polish follow-up

- Finished the rest of Batch 1 from the optimized backlog:
  - stronger preview fallback states for workspace files and task files
  - stronger empty/error handling on workspace admin surfaces
- Replaced hard `notFound()` behavior on `Manage Workspace` with a product-facing recovery state when the workspace cannot load.
- Improved workspace-file and task-file UX:
  - explicit `Download only` state for unsupported preview formats
  - clearer empty states
  - stronger inline error treatment
  - real upload-pending state instead of relying only on refresh transitions
- Updated the optimized backlog and status docs so Batch 1 is now fully complete.

### Identity and access batch

- Added scoped bearer credentials for agent API access:
  - Prisma models for `AgentCredential` and `AuthEvent`
  - migration `202603160010_agent_credentials_auth_events`
- Added real API auth resolution that supports:
  - owner cookie auth
  - agent bearer-token auth
  - scope checks for task, comment, activity, execution, attachment, search, and context APIs
- Added product-facing agent credential management inside `Manage Workspace`:
  - create credential
  - reveal token once on creation
  - revoke or re-enable credential
  - recent auth event trail
- Added actor-attributed agent mutations so authenticated agent writes are now tied to the credential’s membership identity instead of trusting free-form request fields.
- Added owner and agent auth-event logging for:
  - owner sign-in
  - owner sign-out
  - agent credential create
  - agent credential revoke / enable
  - agent credential use
  - scope-denied attempts
- Added session-expiry handling in middleware and the sign-in screen so expired owner sessions get a clearer re-auth path.
- Updated agent docs and contract export to reflect bearer credentials and the new auth resources.
- Added an automated auth-access test covering:
  - owner credential creation
  - bearer-authenticated task read
  - bearer-authenticated comment write
  - scoped denial for execution write without permission
- Verified the batch through Docker with:
  - successful database reset and reseed
  - successful production build
  - successful full test suite including auth-access

### OpenClaw launch integration

- Added a launch-safe OpenClaw integration path through `Manage Workspace`.
- Added schema support for:
  - `WorkspaceOpenClawIntegration`
  - external membership mapping via `Membership.sourceSystem` and `Membership.sourceKey`
- Added two official discovery modes for registered OpenClaw instances:
  - argv-based CLI execution, intended for `openclaw agents list --json` or owner-managed wrappers
  - mounted `openclaw.json` parsing, using `agents.list` as the source of truth
- Added owner-only APIs for:
  - reading and updating the active workspace OpenClaw configuration
  - triggering an OpenClaw sync
- Added sync behavior that:
  - creates or updates OpenClaw-sourced agent members
  - preserves source attribution with `sourceSystem=openclaw`
  - disables previously synced OpenClaw agents that are no longer present
  - records sync success and failure in auth events
- Added a new `Manage Workspace` panel for:
  - instance registration
  - discovery mode selection
  - sync execution
  - viewing synced OpenClaw agents and their discovered capabilities
- Updated agent docs/contract export to document the new OpenClaw admin endpoints.
- Added an automated test for registering an OpenClaw config-file integration and syncing discovered agents into the workspace.

### Release preparation

- Added a release-ready Docker path:
  - multi-stage `app/Dockerfile` with `dev` and `release` targets
  - new `docker-compose.prod.yml`
  - persistent production volume for app storage
  - `/api/health` endpoint for runtime health checks
- Added versioning and release docs:
  - root `VERSION` file set to `0.1.0`
  - root `CHANGELOG.md`
  - `project/release-v0.1.0.md`
- Added installation and update scripts:
  - `scripts/install.sh`
  - `scripts/update.sh`
- Updated `.env.example`, `.gitignore`, and `README.md` for private-repo deployment and versioned updates.

### Public install follow-up

- Switched the default install repo URL to public HTTPS.
- Added `scripts/bootstrap-public.sh` for fresh-machine installs via `curl | bash`.
- Bumped the release version to `v0.1.1`.
- Updated `README.md`, `CHANGELOG.md`, and release notes for the public install flow.
