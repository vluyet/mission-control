# Mission Control

Mission Control is a task operations app for human teammates and AI agents working inside the same system.

## Release status

Current version: `v0.1.8`

This release is launch-ready with:

- owner authentication
- multi-workspace support
- projects, tasks, comments, activity, watchers, attachments, and execution logs
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

## One-line install

Fresh machine install:

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.8/scripts/bootstrap-public.sh | bash
```

Optional overrides:

```bash
MC_INSTALL_DIR=/opt/mission-control \
MC_OWNER_EMAIL=owner@example.com \
MC_OWNER_PASSWORD='change-me-now' \
MC_APP_PORT=3000 \
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.8/scripts/bootstrap-public.sh | bash
```

## Production install

Use the production compose file plus the install script.

From a cloned repo:

```bash
./scripts/install.sh --repo https://github.com/vluyet/mission-control.git --dir mission-control --version v0.1.8
```

Optional environment overrides:

- `MC_OWNER_EMAIL`
- `MC_OWNER_PASSWORD`
- `MC_AUTH_SECRET`
- `MC_POSTGRES_PASSWORD`
- `MC_COMPOSE_PROJECT_NAME`
- `MC_APP_PORT`

The install script will:

- clone the repo
- check out the requested version
- generate a production `.env` if one does not exist
- build and start the stack with `docker-compose.prod.yml`

## Production update

Run this from the installed repo directory:

```bash
./scripts/update.sh
```

Or pin to a specific release:

```bash
./scripts/update.sh --version v0.1.8
```

The update script will:

- fetch tags and resolve the target version
- check out the requested release (or latest tag)
- rebuild and restart the production Docker stack
- rely on the app container startup to run Prisma migrations and bootstrap safely
- wait for `/api/health` and fail loudly with recent logs if the app does not come back

## Deployment model

Production uses:

- `docker-compose.prod.yml`
- the `release` target in [app/Dockerfile](/Users/vluyet/Sites/mission-control/app/Dockerfile)
- persistent Docker volumes for PostgreSQL data and app file storage

Health endpoint:

- `/api/health` (returns status, deployed version, commit, and timestamp)

## External agent integration

Mission Control now ships an MVP OpenClaw integration for workspace linking, agent sync, and task dispatch through the OpenClaw gateway API.

For Docker production installs, the bundled `openclaw-connector` service exposes a stable in-stack endpoint for the app. Configure Mission Control OpenClaw linkage with:

- Base URL: `http://host.docker.internal:18890`
- Token: the OpenClaw `gateway.auth.token`


## API docs

- Product-facing agent docs: `/docs/agents`
- JSON summary: `/api/docs/agents`
- Machine-readable contract: `/api/docs/agents/contract`

## Release notes

- [CHANGELOG.md](/Users/vluyet/Sites/mission-control/CHANGELOG.md)
- [project/release-v0.1.5.md](/Users/vluyet/Sites/mission-control/project/release-v0.1.5.md)
- [project/release-v0.1.6.md](/Users/vluyet/Sites/mission-control/project/release-v0.1.6.md)
- [project/release-v0.1.7.md](/Users/vluyet/Sites/mission-control/project/release-v0.1.7.md)
