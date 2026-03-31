# Changelog

## v0.2.3 - 2026-03-31

OpenClaw bridge sync and persistent-workspace task dispatch stabilization.

- Fixed Mission Control OpenClaw agent sync so bridge-based discovery correctly surfaces real agents from both direct listing and session-derived sources.
- Restored correct real-agent visibility for OpenClaw-backed workspaces by aligning the bridge sync path with `main` and `nova` instead of stale test-only agent rows.
- Hardened OpenClaw compatibility by preferring bridge `GET /agents` while keeping fallback compatibility for older invocation paths.
- Fixed task ID generation so repeated project/task creation in persistent workspaces no longer collides on `Task.id` uniqueness.
- Updated OpenClaw integration tests for bridge-first discovery, webhook payload normalization, and persistent-state-safe auth/task flows.
- Documented the current host-bridge behavior for agent discovery and dispatch debugging.

## v0.2.2 - 2026-03-26

Task communication and runtime reliability hardening.

- Reworked task communication UX into a cleaner split: human/agent comments plus a terminal-style task timeline for operational events.
- Standardized timeline event semantics for agent lifecycle and comment actions (`Task dispatched`, `Agent accepted task`, `Agent retrieved context`, `Agent finished task`, comment add/edit/delete).
- Updated OpenClaw task instructions to reduce noisy periodic logs and use explicit lifecycle reporting lines suitable for monitoring and follow-up automation.
- Improved comment composer responsiveness with immediate submit feedback, disabled/loading states, optimistic list updates, and clearer validation behavior.
- Added database startup preflight support (`scripts/ensure-db.sh`) and wired install-time host service generation to run DB readiness checks before app start.
- Stabilized CI/runtime alignment for Docker+host startup assumptions and database availability paths.

## v0.2.1 - 2026-03-23

Async-first OpenClaw dispatch plus human-agent operations UX refinement.

- Made OpenClaw task dispatch async-first, with immediate acceptance and correct task lifecycle transitions through `in_progress` and `review`.
- Added dedicated OpenClaw activity visibility plus lightweight live refresh on active task detail pages.
- Restored Queue as a first-class workspace surface and made Queue / My Tasks / project task views attention-first.
- Added review-summary, agent health, and intervention-focused task-detail UX for agent work.
- Simplified project, task, and settings hierarchy while improving members/settings empty and saving states.
- Cleaned up build/start env loading and aligned public implementation docs for this release.

## v0.2.0 - 2026-03-23

Simplified product surface release with recovered cleanup work and release/runtime hardening.

- Restored the intended simplified Mission Control workspace flow from yesterday's cleanup work.
- Reduced the default product surface to the core areas: Projects, My Tasks, Members, and Settings.
- Redirected non-core workspace routes `/activity`, `/queue`, and `/search` back to `/projects`.
- Kept the host-app + Docker-PostgreSQL runtime alignment and hardened install/update flows from the recent release work.
- Preserved the OpenClaw bridge/discovery compatibility improvements needed for the current deployment.

## v0.1.13 - 2026-03-23

Release hardening and host-runtime alignment for the current OpenClaw-backed deployment model.

- Aligned production install and update flows with the documented host-app + Docker-PostgreSQL runtime.
- Hardened `scripts/install.sh` and `scripts/update.sh` for version resolution, service restart, deployment stamping, and health checks.
- Added configurable `MC_APP_PORT` and `MC_DB_PORT` support across release/install paths.
- Hid disabled stale OpenClaw agents from workspace discovery to reduce operator confusion.
- Consolidated backlog/release documentation and refreshed release metadata for `v0.1.13`.

## v0.1.12 - 2026-03-18

OpenClaw autonomous task-handling stabilization and production hardening.

- Simplified task dispatch to a single OpenClaw `/hooks/agent` call and aligned dispatch auth with hooks token support.
- Added scoped runtime agent bearer credential issuance per dispatch (`tasks.read`, `execution.write`, `comments.write`).
- Injected Mission Control callback contract into dispatch prompt so agents can report progress and final answers via API.
- Persisted synchronous hook response text into task comments when available.
- Added richer dispatch payload/status execution logging for faster production debugging.
- Updated deployment/readme documentation and release metadata for `v0.1.12`.

## v0.1.11 - 2026-03-17

Stabilized OpenClaw integration by moving the Mission Control app to the host runtime on `piclaw` while keeping PostgreSQL in Docker.

- Switched the working production topology to host-run Mission Control app + host-run OpenClaw + Dockerized PostgreSQL
- Added a host bridge service (`mc-openclaw-host-bridge.service`) exposing OpenClaw integration endpoints on port `18891`
- Updated OpenClaw connector detection so Mission Control recognizes the host bridge on port `18891`
- Simplified `docker-compose.prod.yml` to the database service for this deployment model
- Documented the current working production runtime model in the README

## v0.1.10 - 2026-03-16

Docker-native OpenClaw proxying for Mission Control.

- Added an `openclaw-connector` service to the production compose stack using host networking so it can reach a loopback-bound OpenClaw gateway so Mission Control can target OpenClaw through an in-stack hostname
- Updated OpenClaw workspace configuration guidance to prefer `http://host.docker.internal:18890` in Docker deployments
- Documented the Docker/OpenClaw integration path in the README

## v0.1.9 - 2026-03-16

Production update flow hardening.

- Hardened `scripts/update.sh` so it resolves the target release, restarts the production stack, and verifies `/api/health`
- Exposed deployed version, commit, and timestamp from `/api/health` for easier verification after upgrades
- Updated deployment documentation for the new update flow and current OpenClaw-enabled MVP state

## v0.1.8 - 2026-03-16

Reintroduced OpenClaw integration for MVP task execution.

- Added workspace-level OpenClaw gateway linking with owner-only configuration and stored sync state
- Added authenticated OpenClaw agent discovery via the gateway API and synced discovered agents into workspace members
- Added task dispatch to OpenClaw through the linked gateway plus a task-level dispatch control in the UI
- Documented Mission Control reporting conventions for OpenClaw runs using task, context, execution, comments, and status APIs
- Added regression coverage for OpenClaw linking, sync, and dispatch flows

## v0.1.7 - 2026-03-16

Removed the OpenClaw-specific integration before launch.

- Removed the workspace OpenClaw configuration panel and sync endpoints
- Removed stored OpenClaw integration data from the schema
- Replaced the old integration trail with a new spec-pending external agent registry follow-up

## v0.1.6 - 2026-03-16

OpenClaw binding documentation and operator UX follow-up.

- Added a dedicated OpenClaw binding guide covering supported discovery modes, Docker setup, and common failure cases
- Clarified in the product UI and agent docs that dashboard URL is reference metadata only and does not power agent discovery
- Improved the raw `spawn openclaw ENOENT` failure into a clearer CLI-not-found setup error
- Added follow-up backlog items for JSON5-safe config parsing and container-aware OpenClaw diagnostics

## v0.1.5 - 2026-03-16

Launch workspace bootstrap follow-up.

- Production bootstrap now creates the same default workspace slug used by the app fallback
- Active workspace resolution now falls back to the first available workspace if no cookie-matched slug exists
- This fixes first launch for installs that signed in successfully but showed no workspace

## v0.1.4 - 2026-03-16

Production install hardening follow-up.

- Fresh installs now write `COMPOSE_PROJECT_NAME=missioncontrol` into `.env` so they do not inherit stale `mission-control` Docker containers and volumes
- Release startup now runs an idempotent database bootstrap after migrations so the owner and empty workspace exist on first launch
- Updated install and release docs for the new public bootstrap version

## v0.1.3 - 2026-03-16

Installer retry follow-up.

- Public and local installers now retry automatically if Docker reports a port bind conflict
- `.env` is updated with the new chosen `APP_PORT` before the retry
- Explicit `MC_APP_PORT` values still fail fast when occupied, with a clear message

## v0.1.2 - 2026-03-16

Install-flow reliability follow-up.

- Public bootstrap now detects when port `3000` is already in use
- If no `MC_APP_PORT` is set, install automatically picks the next free port
- If `MC_APP_PORT` is explicitly set and occupied, install fails early with a clear message

## v0.1.1 - 2026-03-16

Public install follow-up release.

- Public HTTPS clone is now the default install flow
- Added `scripts/bootstrap-public.sh` for one-line installs on fresh machines
- Updated release docs and install examples for public GitHub distribution

## v0.1.0 - 2026-03-16

Initial launch-ready release.

- Empty launch state with one owner user and one empty workspace
- Workspace, project, task, member, comment, activity, watcher, attachment, and execution models
- Owner authentication and scoped agent API credentials
- Agent-ready API contracts and documentation
- Workspace asset library and workspace administration
- Docker production compose, versioned install script, and update script
