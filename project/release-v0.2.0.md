# Release v0.2.0

Date: 2026-03-23

## Highlights

- Restores the intended simplified Mission Control product surface from the cleanup work completed on 2026-03-22.
- Keeps the workspace focused on the core operating areas: Projects, My Tasks, Members, and Settings.
- Redirects non-core workspace routes (`/activity`, `/queue`, `/search`) back to `/projects` instead of exposing extra UI surfaces.
- Carries forward the host-runtime, install/update hardening, and OpenClaw bridge compatibility improvements from the prior release line.

## Operational notes

- Production runtime remains: host-run Mission Control app, host-run OpenClaw, Dockerized PostgreSQL, and host bridge on `127.0.0.1:18891`.
- This release supersedes `v0.1.13` for deployment clarity because it includes the missing simplification work that should have shipped with the previous release.
