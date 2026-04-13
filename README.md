# Mission Control

Mission Control is a task operations app for human teammates and Constructor-backed agents working inside the same system.

## Release status

Current version: `v0.3`

Current product surface:

- owner authentication
- multi-workspace support
- projects, tasks, comments, timeline-style activity monitoring, watchers, attachments, and execution logs
- workspace administration and shared workspace files
- scoped agent API credentials
- Constructor public API sync, dispatch, callback, and status polling

Release `v0.3` removes the retired OpenClaw compatibility runtime and keeps Mission Control centered on the active Constructor flow.

## Local development

All runtime commands should run through Docker.

For ad-hoc CI mirroring on a machine that already has a real repo-root `.env`, use a separate env file instead of overwriting deployment settings.

```bash
cp .env.example .env
docker compose up -d --build
```

Useful commands:

```bash
docker compose exec app npm run build
docker compose exec app npm run test
docker compose exec app npm run ci:check
docker compose exec app npm run db:reset
```

The workspace shell top bar surfaces the current deployed version and, when available, the deployed branch and commit.

## One-line install

Fresh machine install:

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.3/scripts/bootstrap-public.sh | bash
```

Optional overrides:

```bash
MC_INSTALL_DIR=/opt/mission-control \
MC_OWNER_EMAIL=owner@example.com \
MC_OWNER_PASSWORD='change-me-now' \
MC_APP_PORT=3000 \
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.3/scripts/bootstrap-public.sh | bash
```

## Production runtime

The current runtime model is:

- PostgreSQL runs through `docker-compose.prod.yml`
- the Next.js app runs on the host via `systemctl --user` as `mission-control-app.service`
- the host service serves the built app from `app/.next-build`
- external agent execution goes through the configured Constructor public API

When updating a host-run deployment, rebuild the app before restarting the service so `.next-build` matches the checked-out source.

## Production install

Use the production compose file plus the install script.

From a cloned repo:

```bash
./scripts/install.sh --repo https://github.com/vluyet/mission-control.git --dir mission-control --version v0.3
```

Optional environment overrides:

- `MC_OWNER_EMAIL`
- `MC_OWNER_PASSWORD`
- `MC_AUTH_SECRET`
- `MC_POSTGRES_PASSWORD`
- `MC_COMPOSE_PROJECT_NAME`
- `MC_APP_PORT`
- `MC_DB_PORT`
- `MC_INSTALL_SYSTEMD_USER`

The install script will:

- clone the repo
- check out the requested version
- generate a production `.env` if one does not exist
- build and start the stack with `docker-compose.prod.yml`
- generate a host app service that runs a DB preflight before app start

## Production update

Run this from the installed repo directory:

```bash
./scripts/update.sh
```

Or pin to a specific release:

```bash
./scripts/update.sh --version v0.3
```

The update script will:

- fetch tags and resolve the target version
- check out the requested tag, branch, or commit
- stamp deployment metadata into `app/DEPLOYMENT.json` so the app and `/api/health` expose the deployed ref
- rebuild the host app, apply Prisma deploy/bootstrap, and restart the documented host app service when available
- run DB preflight before host app start to avoid booting against an unavailable PostgreSQL instance
- restart the production PostgreSQL stack
- wait for `/api/health` and fail loudly with recent logs if the app does not come back

## Testing unreleased work on another machine

To validate work from GitHub before tagging a release, publish the branch and update the test machine to that exact ref.

Examples:

```bash
./scripts/update.sh --version main
./scripts/update.sh --version feat/my-branch
./scripts/update.sh --version 7951376
```

Notes:

- If the test machine uses the documented `mission-control-app.service`, `scripts/update.sh` will restart it automatically.
- If the host app is managed differently, set `MC_APP_RESTART_CMD` to the correct restart command before running the update script.
- After the update, verify the top bar or call `/api/health` to confirm the deployed version, branch, and commit.

## Constructor integration

Mission Control’s only external runtime integration is the Constructor public API.

Workspace owners configure Constructor from Manage Workspace with:

- Base URL
- API token
- optional callback token for local bookkeeping
- enabled/disabled state

Current upstream calls used by the app:

- `GET /api/v1/agents`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:bridgeExecutionId`
- `GET /api/v1/tasks/by-external/:externalTaskId`

Current Mission Control callback ingress:

- `POST /api/tasks/:taskId/constructor/callback`

## Deployment model

Production uses:

- `docker-compose.prod.yml` for PostgreSQL only
- host-run Next.js app from `app/`
- configurable host PostgreSQL bind via `DB_PORT` (default `5432`)
- persistent Docker volumes for PostgreSQL data

Health endpoint:

- `/api/health` returns status, deployed version, commit, and timestamp

## API docs

- Product-facing agent docs: `/docs/agents`
- JSON summary: `/api/docs/agents`
- Machine-readable contract: `/api/docs/agents/contract`

## Product cleanup plan

For the next simplification pass, see:

- [project/cleanup-plan-v0.2.md](project/cleanup-plan-v0.2.md)

This plan narrows Mission Control back to a small core product before further expansion.

## Release notes

- [CHANGELOG.md](CHANGELOG.md)
- [project/release-v0.1.5.md](project/release-v0.1.5.md)
- [project/release-v0.1.6.md](project/release-v0.1.6.md)
- [project/release-v0.1.7.md](project/release-v0.1.7.md)
- [project/release-v0.1.11.md](project/release-v0.1.11.md)
- [project/release-v0.2.0.md](project/release-v0.2.0.md)
- [project/release-v0.2.1.md](project/release-v0.2.1.md)
- [project/release-v0.2.2.md](project/release-v0.2.2.md)
- [project/release-v0.2.3.md](project/release-v0.2.3.md)
- [project/release-v0.3.md](project/release-v0.3.md)
