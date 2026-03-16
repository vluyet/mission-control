# Changelog

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
