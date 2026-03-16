# Mission Control

Mission Control is a task operations app for human teammates and AI agents working inside the same system.

## Release status

Current version: `v0.1.2`

This release is launch-ready with:

- owner authentication
- multi-workspace support
- projects, tasks, comments, activity, watchers, attachments, and execution logs
- workspace administration and shared workspace files
- scoped agent API credentials
- OpenClaw instance registration and launch-safe agent discovery

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

## One-line install

Fresh machine install:

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.2/scripts/bootstrap-public.sh | bash
```

Optional overrides:

```bash
MC_INSTALL_DIR=/opt/mission-control \
MC_OWNER_EMAIL=owner@example.com \
MC_OWNER_PASSWORD='change-me-now' \
MC_APP_PORT=3000 \
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.2/scripts/bootstrap-public.sh | bash
```

## Production install

Use the production compose file plus the install script.

From a cloned repo:

```bash
./scripts/install.sh --repo https://github.com/vluyet/mission-control.git --dir mission-control --version v0.1.2
```

Optional environment overrides:

- `MC_OWNER_EMAIL`
- `MC_OWNER_PASSWORD`
- `MC_AUTH_SECRET`
- `MC_POSTGRES_PASSWORD`
- `MC_APP_PORT`

The install script will:

- clone the repo
- check out the requested version
- generate a production `.env` if one does not exist
- build and start the stack with `docker-compose.prod.yml`

## Production update

Run this from the installed repo directory:

```bash
./scripts/update.sh --version latest
```

Or pin to a specific release:

```bash
./scripts/update.sh --version v0.1.2
```

## Deployment model

Production uses:

- `docker-compose.prod.yml`
- the `release` target in [app/Dockerfile](/Users/vluyet/Sites/mission-control/app/Dockerfile)
- persistent Docker volumes for PostgreSQL data and app file storage

Health endpoint:

- `/api/health`

## OpenClaw integration

Mission Control can register an OpenClaw instance in `Manage Workspace` and discover agents into workspace members.

The current launch-safe discovery modes are:

- CLI execution, typically `openclaw agents list --json`
- mounted `openclaw.json` parsing through `agents.list`

This intentionally avoids shipping a partial Gateway device-auth client in the first release.

## API docs

- Product-facing agent docs: `/docs/agents`
- JSON summary: `/api/docs/agents`
- Machine-readable contract: `/api/docs/agents/contract`

## Release notes

- [CHANGELOG.md](/Users/vluyet/Sites/mission-control/CHANGELOG.md)
- [project/release-v0.1.2.md](/Users/vluyet/Sites/mission-control/project/release-v0.1.2.md)
