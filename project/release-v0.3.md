# Release v0.3

Date: 2026-04-13

## Summary

This release removes the retired OpenClaw compatibility runtime and makes Constructor the only supported external execution path in the active Mission Control product. It also hardens release and CI commands so host-side Prisma checks no longer fail on missing environment variables.

## Highlights

- Mission Control now ships only the active Constructor public API integration path.
- The remaining OpenClaw bridge, connector, webhook, and settings compatibility code is gone from the current app runtime.
- A cleanup migration removes stale OpenClaw workspace integration data and detaches leftover OpenClaw-linked records.
- Host-side Prisma commands now load the root environment consistently, fixing local `npm run ci:check` and other migration-driven release tasks.
- Production builds no longer ingest stale `.next-dev` route types on the host.

## What changed

### Constructor-only runtime surface
- Deleted the old OpenClaw API routes under task and workspace settings.
- Removed the retired bridge and connector service code from the repository.
- Cleaned the API contract, README, and current planning docs so they document only the current Constructor flow.

### Data and schema cleanup
- Removed `WorkspaceOpenClawIntegration` from the Prisma schema.
- Added a migration to drop the retired integration table, clear stale OpenClaw task assignee/reviewer references, remove stale watcher/project-membership/credential rows, and disable leftover OpenClaw memberships.

### CI and release hardening
- Wrapped Prisma CLI scripts with the existing root-env loader so host execution resolves `DATABASE_URL` from the repo root `.env`.
- This fixes local `npm run test:migrations`, `npm run db:deploy`, `npm run db:reset`, and `npm run ci:check` when run outside Docker.
- Kept the Docker-based GitHub Actions flow aligned with the same application scripts.

## Validation

- `cd app && npm run ci:check` passes on the host.
- The Docker-based CI flow passes locally with an isolated CI env file and an alternate host DB port, matching the GitHub Actions command path without overwriting a real repo-root `.env`.
- `npm run build` produces only Constructor-era task/workspace routes.
- The host-run service starts successfully from `.next-build`, and `/api/health` reports the current deployed branch and commit.

## Upgrade guidance

1. Update to `v0.3` using the normal update flow.
2. Verify `/api/health` after restart.
3. Confirm Manage Workspace shows only Constructor integration settings.
4. Apply the new Prisma migration before expecting stale OpenClaw-linked records to be cleaned up.