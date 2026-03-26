# Mission Control

Mission Control is a task operations app for human teammates and AI agents working inside the same system.

## Release status

Current version: `v0.2.2`

This release is launch-ready with:

- owner authentication
- multi-workspace support
- projects, tasks, comments, timeline-style activity monitoring, watchers, attachments, and execution logs
- workspace administration and shared workspace files
- scoped agent API credentials

## Local development

All runtime commands should run through Docker.

```bash
cp .env.example .env
docker compose up -d --build
```

Useful commands:

```bash
docker compose exec app npm run build
docker compose exec app npm run test
docker compose exec app npm run db:reset
```

The workspace shell top bar now surfaces the current deployed version and, when available, the deployed branch and commit.

## One-line install

Fresh machine install:

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.2.2/scripts/bootstrap-public.sh | bash
```

Optional overrides:

```bash
MC_INSTALL_DIR=/opt/mission-control \
MC_OWNER_EMAIL=owner@example.com \
MC_OWNER_PASSWORD='change-me-now' \
MC_APP_PORT=3000 \
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.2.2/scripts/bootstrap-public.sh | bash
```

## Production runtime (current working model)

The current working OpenClaw integration model on `piclaw` is:

- Mission Control app runs on the host via `systemctl --user` (`mission-control-app.service`)
- PostgreSQL stays in Docker via `docker-compose.prod.yml`
- OpenClaw runs on the host
- A small host bridge exposes OpenClaw integration endpoints on `http://127.0.0.1:18891` via `mc-openclaw-host-bridge.service`

Use this OpenClaw integration base URL inside Mission Control:

- `http://127.0.0.1:18891`

This avoids unreliable container-to-host networking for the host-installed OpenClaw instance.

## Production install

Use the production compose file plus the install script.

From a cloned repo:

```bash
./scripts/install.sh --repo https://github.com/vluyet/mission-control.git --dir mission-control --version v0.2.2
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
./scripts/update.sh --version v0.2.2
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

## Deployment model

Production uses:

- `docker-compose.prod.yml` for PostgreSQL only
- host-run Next.js app from `app/`
- configurable host PostgreSQL bind via `DB_PORT` (default `5432`)
- persistent Docker volumes for PostgreSQL data

Health endpoint:

- `/api/health` (returns status, deployed version, commit, and timestamp)

## External agent integration

Mission Control now ships an MVP OpenClaw integration for workspace linking, agent sync, and task dispatch through the OpenClaw gateway API.

For Docker production installs, the bundled `openclaw-connector` service exposes a stable in-stack endpoint for the app. Configure Mission Control OpenClaw linkage with:

- Base URL: `http://127.0.0.1:18891`
- Token: the OpenClaw `gateway.auth.token`

If your OpenClaw runtime accepts discovery with the gateway token but rejects `/hooks/agent` with `401`, configure the host bridge with a separate `OPENCLAW_HOOK_TOKEN` for dispatch while keeping `OPENCLAW_GATEWAY_TOKEN` for agent discovery.

Minimal agent exposure endpoints:

- `GET /agents` → list available agents for linking
- `POST /identity/validate` with `{ "token": "..." }` → validate OpenClaw identity token
- `POST /workspace-links` with `{ "workspaceId": "...", "agentId": "..." }` → link agent to workspace
- `GET /workspace-links` → inspect current links (MVP in-memory)
- `POST /workspace-dispatch` with `{ "workspaceId": "...", "taskId": "...", "prompt": "..." }` → run work through linked agent


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
