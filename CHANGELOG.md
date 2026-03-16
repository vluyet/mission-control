# Changelog

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
- OpenClaw instance registration and launch-safe agent discovery
- Docker production compose, versioned install script, and update script
