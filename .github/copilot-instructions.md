# Mission Control repository instructions

## Build, test, and lint commands

Local development and CI run from the repo root through Docker. The app itself lives in `app/`, but its scripts expect the repo-root `.env`.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run lint
docker compose exec app npm run test
docker compose exec app npm run build
docker compose exec app npm run ci:check
docker compose exec app npm run db:reset
```

Single-test entrypoints that already exist:

```bash
docker compose exec app npm run test:smoke
docker compose exec app npm run test:activity
docker compose exec app npm run test:auth
docker compose exec app npm run test:constructor
docker compose exec app npm run test:i18n
```

Run one test file directly with the same env loading the repo uses:

```bash
docker compose exec app node scripts/with-root-env.mjs node --test tests/auth-access.test.mjs
```

CI mirrors this flow with `docker compose --env-file .env.ci up -d --build --wait db app`, then `npm run db:reset`, `npm run test:migrations`, `npm run test`, and `npm run build`.

Live production deploys are different from local Docker builds. The live app is host-run from `app/` as the user systemd service `mission-control-app.service`, serving the promoted `.next-build` bundle on port 3000. When asked to deploy or rebuild the live app, do not use `docker compose exec app npm run build`.

Use this host workflow instead:

```bash
cd app
systemctl --user stop mission-control-app.service
npm run build
systemctl --user start mission-control-app.service
systemctl --user is-active mission-control-app.service
curl -fsS http://127.0.0.1:3000/api/health
```

Use `npm run rebuild:live` only when intentionally doing a direct host cutover that manages the live listener itself. The safer default for routine live deploys is stop service, build on host, start service, then verify `/api/health`.

## High-level architecture

- `app/` is a Next.js 14 App Router application. UI routes are under `app/src/app/(workspace)` and API routes are under `app/src/app/api`.
- PostgreSQL is the only database. The schema in `app/prisma/schema.prisma` models owner auth, workspaces, memberships, projects, tasks, comments, activity, watchers, attachments, agent credentials, Constructor integrations, executions, and callback receipts.
- Shared server-side data shaping is centralized in `app/src/lib/server-data.ts`, which re-exports domain helpers from `app/src/lib/server/*.ts`. Pages and API routes generally consume those helpers instead of reaching into Prisma directly from UI code.
- Constructor is the only external runtime integration. Workspace-level configuration is stored in `WorkspaceConstructorIntegration`; sync turns Constructor agents into `Membership` rows; dispatch builds a task-first instruction plus resolved context; callback/status routes update task state, execution logs, and comments.
- Task context is layered, not flat: workspace context + project context + task hint are merged by `app/src/lib/context-resolver.ts` in that order.
- File uploads are stored on disk under `app/storage/task-attachments` and `app/storage/workspace-assets`, with metadata stored in Postgres.
- Production is split from dev: `docker-compose.prod.yml` runs PostgreSQL, while the Next.js app is host-run from `app/` and serves the promoted `.next-build` bundle. Deployment metadata comes from `app/DEPLOYMENT.json` and `VERSION`, and is exposed in the UI and `/api/health`.

## Key conventions

- Keep runtime commands aligned with the repo-root env. App-level scripts that touch the database or runtime should use `app/scripts/with-root-env.mjs` rather than assuming an app-local `.env`.
- Do not edit `.next-build`, `.next-build-prev`, or `.next-dev`. They are generated build outputs. Use `npm run build`, `npm run rebuild:live`, or the scripts in `app/scripts/` instead.
- For live production cutovers on this host, prefer the host service workflow: stop `mission-control-app.service`, run `npm run build` in `app/`, start the service again, then verify `http://127.0.0.1:3000/api/health`. Do not treat the Docker app container as the source of truth for live deploys.
- API routes use the shared response envelope from `app/src/lib/api-response.ts` (`ok: true/false`, plus `meta`) and authenticate through `app/src/lib/api-auth.ts`. Owner access comes from the signed session cookie; agent access comes from hashed bearer tokens with explicit scopes.
- User-facing strings are localized. Server components use `getRequestI18n()`, API routes use `getApiT()`, and locale is resolved from the locale cookie or `Accept-Language`. Follow that path instead of hardcoding new English-only strings.
- Workspace selection is cookie-driven. Many server helpers resolve the active workspace from `mission_control_workspace` and fall back to the default slug `north-star-lab`.
- Constructor dispatch is intentionally task-first. Before dispatching, the route rejects underspecified tasks and builds the outbound instruction from the task description, recent comments, attachments, child tasks, and resolved workspace/project/task context. Preserve that behavior instead of sending generic prompts.
- Tests use Node’s built-in test runner from `app/tests`. Many tests talk to a running app via `TEST_BASE_URL`; mutation helpers intentionally refuse the default local instance unless `MC_ALLOW_LIVE_TEST_MUTATIONS=1` is set or the target is an isolated environment.
