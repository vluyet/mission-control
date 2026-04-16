# Shared Live Update Workflow

Audit date: 2026-04-16

## Purpose

This document defines the approved workflow for updating the shared Mission Control app used by the team.

The shared app on port 3000 is the only visible and testable app for developers. There is no parallel team-facing instance on another port.

## Why This Workflow Exists

The app currently builds and starts from the same build directory in [../app/package.json](../app/package.json), with the active dist directory selected by [../app/next.config.mjs](../app/next.config.mjs).

If that live build directory is rebuilt in place while the current server is still serving requests, the app can return mixed old and new assets. That leads to stale UI, missing CSS, and missing JS chunks.

As of this audit, the default host automation still promotes directly into `.next-build`.

That means `npm run build`, `npm run rebuild:live`, and `./scripts/update.sh` are not the approved shared cutover path for port 3000 until they are updated to preserve a private candidate build and rollback state.

## Core Rules

1. Port 3000 is the only public app for the team.
2. Never rebuild the live build directory in place.
3. Always deploy an exact commit or exact branch head that has been intentionally chosen.
4. Keep the previous build until the new build is verified.
5. If health, smoke, or asset checks fail, roll back immediately.
6. Publishing to GitHub is a separate step and must not be used as a substitute for local release verification.

## Approved Update Workflow

### 1. Prepare the target code

Run from the repository root:

```bash
git fetch origin
git checkout <exact-commit-or-branch>
cd app
npm ci
```

Notes:
- Do not deploy from an uncommitted working tree.
- Do not rely on local unstaged changes.
- If another developer needs to reproduce the release, they must be able to check out the same ref.

### 2. Build a private candidate

Build into a candidate directory instead of the live directory:

```bash
rm -rf .next-build.__new
NEXT_DIST_DIR=.next-build.__new node scripts/with-root-env.mjs ./node_modules/.bin/next build
```

Notes:
- The live app must continue to serve from the current build while this step runs.
- Use `./node_modules/.bin/next` explicitly here. `scripts/with-root-env.mjs` loads the repo-root `.env`, but it does not add `node_modules/.bin` to `PATH`.
- Do not use `npm run build`, `npm run rebuild:live`, or `./scripts/update.sh` for this shared cutover path in their current form because they still promote directly into the live build directory.

### 3. Apply database changes before cutover

Run the data steps from the same checked-out code:

```bash
npm run db:deploy
npm run db:bootstrap
```

Notes:
- Only backward-compatible schema changes should be used in this shared workflow.
- If a migration requires coordinated downtime or a larger release plan, stop and escalate before cutover.

### 4. Stop the live app on port 3000

If the shared app uses the documented user service, stop it with:

```bash
systemctl --user stop mission-control-app.service
```

If the shared app is started another way, use the team-approved stop command for that runner.

Notes:
- The stop should happen only after the candidate build is ready.
- Short downtime at cutover is acceptable. Serving mixed assets is not acceptable.

### 5. Swap the build atomically

From the app directory:

```bash
rm -rf .next-build-prev
if [ -d .next-build ]; then mv .next-build .next-build-prev; fi
mv .next-build.__new .next-build
```

Notes:
- The previous build is kept as the immediate rollback target.
- Do not delete the previous build until verification is complete.

### 6. Start the live app again on port 3000

If the shared app uses the documented user service:

```bash
systemctl --user start mission-control-app.service
```

If the shared app is started another way, use the team-approved start command for that runner.

### 7. Verify the live app immediately

Run the first checks against port 3000:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Then run the smoke test from the app directory:

```bash
npm run test:smoke
```

Notes:
- Health must return success before the update is accepted.
- Smoke routes must pass before the update is accepted.

## Asset Validation Requirement

The current smoke test in [../app/tests/smoke-routes.test.mjs](../app/tests/smoke-routes.test.mjs) only verifies that routes return status 200. It does not verify that the rendered HTML for the main shared pages references valid CSS and JS files.

That means a page can return 200 while still serving a broken UI due to missing assets.

This repo now also contains HTML asset validation in [../app/scripts/rebuild-live.mjs](../app/scripts/rebuild-live.mjs), but that helper currently validates the live `/sign-in` page only. It does not yet replace post-cutover verification of the main shared workspace pages.

Until the release gate validates the main shared pages automatically, the operator must manually verify the following after cutover:

1. Reload the main pages in a clean browser session.
2. Confirm there are no 404 responses for any path under `/_next/static/`.
3. Confirm CSS is present and the UI is not rendering unstyled.
4. Confirm the browser console does not show failed chunk loads.

The main pages to verify are:

1. /
2. /projects
3. /my-tasks
4. /queue
5. /manage-workspace
6. /docs/agents

## Rollback Procedure

If any verification step fails:

1. Stop the app.
2. Remove the failed live build if needed.
3. Restore the previous build.
4. Start the app again.
5. Re-run health checks.

Example rollback from the app directory:

```bash
systemctl --user stop mission-control-app.service
rm -rf .next-build
mv .next-build-prev .next-build
systemctl --user start mission-control-app.service
curl -fsS http://127.0.0.1:3000/api/health
```

If the shared app is not using the documented user service, use the team-approved stop and start commands for that runner.

## What Must Never Happen

1. Do not run a live rebuild directly into .next-build while the current app is serving traffic.
2. Do not delete the previous build before verification passes.
3. Do not treat a 200 page response as proof that CSS and JS are valid.
4. Do not deploy a messy working tree that another developer cannot reproduce.
5. Do not change the public port during routine team updates.

## Team Handoff Checklist

Before handing the update to another developer, confirm all of the following:

1. The exact deployed ref is known.
2. The candidate build completed successfully.
3. Database deploy and bootstrap completed successfully.
4. The live app restarted on port 3000.
5. The health endpoint passed.
6. The smoke routes passed.
7. The main pages were manually checked for missing CSS or JS.
8. The previous build was kept long enough to support rollback.
9. The operator recorded any issue or deviation from the workflow.

## Future Improvement

This workflow should later be tightened further by adding automated asset validation for the main shared pages to the smoke/release gate so verification covers every CSS and JS asset referenced by the rendered HTML, not just `/sign-in`.