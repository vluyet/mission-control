# Release v0.1.13

Date: 2026-03-23

## Highlights

- Production runtime is now clearly aligned to host-run Mission Control app + host-run OpenClaw + Dockerized PostgreSQL.
- Install and update scripts were hardened for tagged releases, alternate ports, deployment metadata stamping, restart flow, and `/api/health` verification.
- OpenClaw workspace discovery now hides disabled stale agents to keep the operator view clean.

## Operational notes

- Default deployment model on `piclaw`: host app service (`mission-control-app.service`), Docker PostgreSQL only, and OpenClaw bridge on `127.0.0.1:18891`.
- `MC_APP_PORT` and `MC_DB_PORT` can be overridden during install for side-by-side validation environments.
- Validation completed against the current install with `scripts/update.sh`, plus a temporary alternate-port install using `MC_APP_PORT=3015` and `MC_DB_PORT=55432`.
