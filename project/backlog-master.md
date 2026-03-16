# Backlog

This is the master backlog for the task app.

## Product scope

A personal multi-workspace task management app where human collaborators and AI agents share the same operational system.

Core layers:
- Workspace
- Project
- Task

Core principles:
- humans and agents are both first-class members
- tasks are the central object
- comments are human-facing communication
- activity is audit history
- execution logs are machine-facing
- the app must stay simple, robust, and familiar

## Delivery rules

- Work in small coherent batches.
- Always execute from `project/sprint-now.md`.
- Do not start a story that is not in the active batch.
- Respect dependencies.
- Prefer simple implementation over architectural cleverness.
- Keep the app safe to run in Docker only.
- Do not install runtime dependencies directly on the host machine.
- Do not run the app directly on the host machine.
- Use Docker and Docker Compose for local development and execution.
- If a new dependency is needed, add it to the app project and install it inside the container only.
- If a command must be run, prefer `docker compose exec ...` or `docker compose run ...`.

## Priority legend

- P0 = mandatory foundation
- P1 = core product value
- P2 = important enhancement
- P3 = later / optional

## Size legend

- XS = a few hours
- S = 0.5–1 day
- M = 1–2 days
- L = 2–4 days

---

# Epic A — Platform foundation

## Goal
Set up the app, database, auth, layout, and shared technical primitives.

### A1 — Initialize application stack
Priority: P0
Size: S

As a developer, I want the project initialized with app framework, styling, ORM, and environment config so that feature work can start on a stable base.

Acceptance criteria:
- app source directory exists
- project can boot in Docker
- base framework is installed
- environment variables are documented
- repository structure is coherent

### A2 — Create database connection and migration workflow
Priority: P0
Size: S

As a developer, I want migrations and schema management in place so that all domain entities can evolve safely.

Acceptance criteria:
- database service runs in Docker
- ORM is configured
- initial migration workflow works
- local commands run through Docker only

### A3 — Create application shell layout
Priority: P0
Size: S

As a user, I want a consistent shell with sidebar, top bar, and main content area so that navigation feels coherent.

Acceptance criteria:
- shell layout exists
- sidebar exists
- top bar exists
- main content region exists
- app renders cleanly in browser

### A4 — Add authentication for a single owner user
Priority: P0
Size: M

As the app owner, I want to sign in securely so that the system is not open.

Acceptance criteria:
- owner sign-in flow exists
- protected area requires authentication
- local auth setup works in Docker
- secrets stay in environment config

### A5 — Add seeded demo data framework
Priority: P1
Size: S

As a developer, I want seed scripts for workspaces, projects, members, and tasks so that UI work is fast and testable.

### A6 — Add global error and empty states
Priority: P1
Size: S

As a user, I want understandable empty and error states so that the app remains usable during early development.

### A7 — Add audit-friendly timestamp and ID conventions
Priority: P0
Size: XS

As a developer, I want consistent IDs and timestamps across entities so that logs and task history remain reliable.

---

# Epic B — Workspace and member model

## Goal
Support multiple workspaces and shared human/agent membership.

### B1 — Create workspace entity and schema
Priority: P0
Size: S

As a user, I want workspaces such as personal or company spaces so that work is separated cleanly.

### B2 — Build workspace list and switcher
Priority: P0
Size: S

As a user, I want to switch between workspaces from the sidebar so that I can move between contexts quickly.

### B3 — Create member entity with shared type model
Priority: P0
Size: M

As a developer, I want members to support both humans and agents so that assignment logic remains unified.

### B4 — Add human member profile fields
Priority: P1
Size: S

As a user, I want human members to have a name, email, avatar, and role so that collaborators are recognizable.

### B5 — Add agent member profile fields
Priority: P0
Size: S

As a user, I want agent members to have a name, type, capabilities, and enabled state so that agents can be used like teammates.

### B6 — Build workspace member directory
Priority: P1
Size: M

As a user, I want to view all workspace members, both human and agent, so that I can manage assignment targets.

### B7 — Add member status management
Priority: P2
Size: S

As a user, I want to enable, disable, or archive members so that inactive humans or agents do not clutter assignment.

---

# Epic C — Projects

## Goal
Support projects within each workspace.

### C1 — Create project entity and schema
Priority: P0
Size: S

As a user, I want projects inside workspaces so that tasks have a meaningful container.

### C2 — Build project creation flow
Priority: P0
Size: S

As a user, I want to create a project with name, description, and dates so that I can start organizing work.

### C3 — Build project list view
Priority: P0
Size: S

As a user, I want a project list inside a workspace so that I can navigate existing work.

### C4 — Build project overview page
Priority: P1
Size: S

As a user, I want a simple overview page showing project metadata and recent activity so that I can orient myself.

### C5 — Add project members
Priority: P0
Size: M

As a user, I want to add workspace members to a project so that assignment is scoped to the correct team.

### C6 — Add project roles
Priority: P2
Size: S

As a user, I want simple roles such as lead, member, observer so that project participation is clearer.

### C7 — Add project archive state
Priority: P2
Size: XS

As a user, I want to archive completed projects so that active work stays focused.

---

# Epic D — Tasks core

## Goal
Deliver the first useful task system.

### D1 — Create task entity and schema
Priority: P0
Size: M

As a developer, I want a robust task model with title, description, status, assignee, priority, and dates so that work can be tracked properly.

### D2 — Build task creation flow
Priority: P0
Size: M

As a user, I want to create a task inside a project with core metadata so that work can enter the system.

Acceptance criteria:
- task can be created from project context
- title is mandatory
- description is optional
- status defaults to `todo`
- assignee options only include project members
- task appears immediately in list and board

### D3 — Build task detail read view
Priority: P0
Size: S

As a user, I want to open a task and see all main metadata so that I can understand what needs to be done.

### D4 — Build task edit flow
Priority: P0
Size: S

As a user, I want to edit title, description, dates, and metadata so that tasks stay current.

### D5 — Add task status model
Priority: P0
Size: S

As a user, I want tasks to move through standard states so that progression is visible.

### D6 — Add task assignee selection
Priority: P0
Size: S

As a user, I want to assign a task to a project member, human or agent, so that responsibility is explicit.

### D7 — Add priority field
Priority: P1
Size: XS

As a user, I want to prioritize tasks so that the most important work stands out.

### D8 — Add due date and start date
Priority: P1
Size: XS

As a user, I want task dates so that timing is clear.

### D9 — Add task tags
Priority: P2
Size: S

As a user, I want to tag tasks so that I can group and filter them flexibly.

### D10 — Add parent/child tasks
Priority: P2
Size: M

As a user, I want subtasks so that larger work can be broken down.

---

# Epic E — Task views

## Goal
Make tasks usable at scale.

### E1 — Build project task list view
Priority: P0
Size: M

As a user, I want a sortable list of tasks so that I can manage work precisely.

### E2 — Build kanban board view
Priority: P0
Size: L

As a user, I want a kanban board grouped by status so that I can visualize flow.

### E3 — Support drag-and-drop task movement on board
Priority: P1
Size: M

As a user, I want to drag tasks across columns so that I can update status quickly.

### E4 — Add task filters
Priority: P1
Size: M

As a user, I want to filter by assignee, status, due date, and tags so that I can focus on relevant work.

### E5 — Add task sorting
Priority: P1
Size: S

As a user, I want to sort by due date, priority, created date, and updated date so that different reviews are easy.

### E6 — Add "my tasks" view
Priority: P1
Size: S

As a user, I want a personal view of tasks assigned to me or to a selected agent so that I can monitor workload.

### E7 — Add saved views
Priority: P2
Size: M

As a user, I want to save common filter combinations so that repeated reviews are faster.

---

# Epic F — Task detail and collaboration

## Goal
Make the task page the operational center.

### F1 — Build comments model and schema
Priority: P0
Size: S

As a developer, I want comments attached to tasks so that discussion has a dedicated place.

### F2 — Build comment composer
Priority: P0
Size: S

As a user, I want to post comments on tasks so that humans and agents can report and discuss work.

### F3 — Build task activity timeline
Priority: P0
Size: M

As a user, I want to see status changes, assignment changes, and important events in a timeline so that the task history is clear.

### F4 — Auto-log key task events to activity
Priority: P0
Size: M

As a developer, I want changes to task metadata automatically recorded so that history is trustworthy.

Acceptance criteria:
- assignment changes create activity entries
- status changes create activity entries
- due date changes create activity entries
- activity entries include actor and timestamp

### F5 — Add comment editing
Priority: P2
Size: XS

As a user, I want to edit a recent comment so that I can correct mistakes.

### F6 — Add mentions in comments
Priority: P2
Size: M

As a user, I want to mention team members in comments so that coordination is easier.

### F7 — Add watchers/followers
Priority: P2
Size: S

As a user, I want to watch a task without being the assignee so that I can follow important work.

---

# Epic G — Agent operations

## Goal
Make AI agents usable as real task performers.

### G1 — Allow agent members to appear in assignee selector
Priority: P0
Size: XS

As a user, I want agents to appear exactly like humans in assignment so that they are first-class collaborators.

### G2 — Add agent capability metadata
Priority: P1
Size: S

As a user, I want an agent to display capability labels so that I know what kinds of tasks it should receive.

### G3 — Create task execution entity
Priority: P0
Size: M

As a developer, I want execution records tied to a task and an agent so that machine work is traceable.

Acceptance criteria:
- execution belongs to one task and one agent member
- execution supports queued/running/blocked/done/failed
- task page can fetch the latest execution
- execution is separate from comments

### G4 — Create execution log entity
Priority: P0
Size: S

As a developer, I want execution logs separate from comments so that internal machine activity stays audit-friendly.

### G5 — Add execution panel on task page
Priority: P1
Size: M

As a user, I want to see latest execution status and logs on a task so that agent activity is transparent.

### G6 — Create agent queue concept
Priority: P1
Size: M

As a developer, I want assigned agent tasks to be discoverable as queue items so that a runner can pick them up reliably.

### G7 — Add status transitions for agent workflow
Priority: P1
Size: S

As a user, I want consistent transitions like todo → in progress → review/done or blocked so that agent work is predictable.

### G8 — Add agent summary comment helper
Priority: P2
Size: S

As a user, I want agent completions to generate clean human-readable summaries so that results are easy to review.

### G9 — Add blocked reason capture
Priority: P1
Size: XS

As a user, I want an agent to mark a task blocked with a reason so that missing inputs are visible.

---

# Epic H — Files and artifacts

## Goal
Support attachments and generated outputs.

### H1 — Create attachment entity and storage contract
Priority: P0
Size: S

As a developer, I want file metadata and storage paths tracked properly so that attachments are reliable.

### H2 — Add file upload on task
Priority: P0
Size: M

As a user, I want to attach files to a task so that context and outputs live together.

### H3 — Add attachment list on task detail
Priority: P0
Size: S

As a user, I want to see task files in one place so that I can access context quickly.

### H4 — Add file upload by agent flow
Priority: P1
Size: M

As a system, I want agents to attach generated files or outputs so that task results are preserved.

### H5 — Add file preview for common types
Priority: P2
Size: M

As a user, I want basic preview for images, PDFs, and text files so that I can inspect outputs faster.

### H6 — Add artifact label/type metadata
Priority: P2
Size: S

As a user, I want to mark files as source, deliverable, output, or reference so that task files are better organized.

---

# Epic I — Search, reporting, and productivity

## Goal
Make the system more practical for daily use.

### I1 — Add global search for projects and tasks
Priority: P1
Size: M

As a user, I want to search across task titles and project names so that I can find work quickly.

### I2 — Add dashboard home
Priority: P1
Size: M

As a user, I want a home dashboard showing due soon, blocked, in review, and recent agent activity so that I can orient myself instantly.

### I3 — Add overdue and due soon indicators
Priority: P1
Size: S

As a user, I want visual indicators for date risk so that I can react early.

### I4 — Add review queue view
Priority: P2
Size: S

As a user, I want a view of tasks waiting for human review so that agent outputs can be processed efficiently.

### I5 — Add basic activity feed by project
Priority: P2
Size: S

As a user, I want to see recent project changes so that passive monitoring is easier.

### I6 — Add completion metrics per project
Priority: P3
Size: M

As a user, I want very basic metrics such as open, blocked, completed so that project health is visible.

---

# Epic J — Settings, permissions, and safety

## Goal
Keep the system safe and adaptable without overengineering.

### J1 — Add workspace roles
Priority: P1
Size: S

As a workspace owner, I want owner/admin/member/viewer roles so that access can be scoped.

### J2 — Add project-level membership enforcement
Priority: P0
Size: M

As a system, I want only project members assignable to project tasks so that scope remains clean.

### J3 — Add agent enabled/disabled switch
Priority: P1
Size: XS

As a user, I want to disable an agent without deleting it so that assignment can be paused safely.

### J4 — Add simple agent permissions model
Priority: P1
Size: M

As a user, I want to define what an agent may do, such as comment, upload files, or change status, so that agents remain bounded.

Acceptance criteria:
- agent permissions can be set at least at workspace level
- unauthorized actions are rejected by API
- UI hides forbidden actions where relevant
- permission checks are logged

### J5 — Add allowed status transitions per actor type
Priority: P2
Size: M

As a system, I want to constrain invalid status changes by humans or agents so that workflow remains consistent.

### J6 — Add project visibility rules
Priority: P2
Size: S

As a user, I want some projects hidden from some members so that sensitive work can be separated.

---

# Epic K — Quality, reliability, and developer operations

## Goal
Make the app maintainable and safe to evolve.

### K1 — Add schema migration checks in CI
Priority: P1
Size: S

As a developer, I want migration validation automated so that database changes stay safe.

### K2 — Add component and route smoke tests
Priority: P1
Size: M

As a developer, I want basic test coverage for key flows so that regressions are caught early.

### K3 — Add activity/event test cases
Priority: P1
Size: S

As a developer, I want task change events tested so that audit history remains correct.

### K4 — Add structured application logging
Priority: P1
Size: S

As a developer, I want structured logs for backend actions so that debugging is practical.

### K5 — Add database backup procedure
Priority: P2
Size: S

As an owner, I want a documented backup and restore process so that task history is safe.

### K6 — Add seed reset workflow for local dev
Priority: P1
Size: XS

As a developer, I want to reset local data quickly so that UI work remains efficient.
