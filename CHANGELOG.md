# Changelog

## v0.1.10 - 2026-03-16

Docker-native OpenClaw proxying for Mission Control.

- Added an `openclaw-connector` service to the production compose stack using host networking so it can reach a loopback-bound OpenClaw gateway so Mission Control can target OpenClaw through an in-stack hostname
- Updated OpenClaw workspace configuration guidance to prefer `http://host.docker.internal:18790` in Docker deployments
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
