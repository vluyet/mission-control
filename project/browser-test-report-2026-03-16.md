# Browser Test Report

Date: 2026-03-16
Method: Real browser pass using the `playwright` skill CLI wrapper
Base URL: `http://127.0.0.1:3000`
Environment: Local Docker app, authenticated owner session

## Scope Covered

- Sign-in flow
- Dashboard load
- Projects list
- Project detail surface
- Task detail surface
- Members directory
- Queue view
- Search page
- Comment composer interaction
- Workspace switch interaction

## Result Summary

Overall status: usable, but not clean enough to ship without another frontend stability pass.

What passed:
- Sign-in completed successfully.
- All core routed pages loaded in the browser.
- Task detail rendered correctly and the comment composer worked.
- Workspace switch persisted and affected subsequent route loads.
- Search route rendered valid results.

What failed or needs attention:
- The dashboard emits a React duplicate-key warning.
- The app requests a missing `favicon.ico`.
- The authenticated shell still shows a `Sign In` navigation item.
- Workspace switching updates the shell workspace header, but task content can remain on the prior workspace/task context until navigation changes.
- Sidebar counters appear global/static rather than workspace-aware after switching workspaces.

## Functional Notes

### Sign-in

Status: Pass

- Sign-in form loaded and accepted the configured local owner credentials.
- Redirect to the authenticated workspace shell worked.

### Dashboard

Status: Soft fail

- The page loaded and was navigable.
- Console warning indicates duplicate React keys in the activity panel, which can lead to unstable rendering behavior.

Evidence:
- Console warning: duplicate key around `Task updated-4m ago`

### Projects

Status: Pass with UX inconsistency

- Projects page loaded in both the default workspace and the switched workspace.
- After switching to `Atelier Operations`, the portfolio/project cards updated correctly.
- Sidebar numeric badges did not appear to update with the active workspace.

### Task Detail

Status: Pass with context consistency issue

- Task detail rendered correctly.
- Comment composer successfully posted a new comment.
- After switching workspace while staying on the same task route, the shell header changed to `Atelier Operations` but the task content still reflected `North Star Lab` task context. This creates a mixed-context screen.

### Members / Queue / Search

Status: Pass

- All three routes rendered without blocking errors.
- Search returned a valid task result for `review`.

## Findings

### 1. Duplicate React keys on dashboard activity

Severity: Medium

Why it matters:
- This can cause unstable list rendering and subtle UI inconsistencies.

Observed:
- Browser console warning on dashboard load about duplicate keys in the activity surface.

### 2. Missing favicon request

Severity: Low

Why it matters:
- Creates unnecessary console noise and makes the app feel unfinished.

Observed:
- `GET /favicon.ico` returned `404`.

### 3. Authenticated shell still exposes `Sign In`

Severity: Medium

Why it matters:
- This creates navigation confusion and weakens product trust.

Observed:
- Sidebar still shows a `Sign In` item even when the user is already signed in and also has a visible `Sign out` action.

### 4. Workspace switching can produce mixed-context task screens

Severity: High

Why it matters:
- This is the most important usability issue from the pass.
- The app’s model depends on workspace and project context being trustworthy.
- Showing one workspace in the shell while keeping another workspace’s task content on screen is confusing for humans and dangerous for future agent-facing behavior.

Observed:
- After switching workspace on `/tasks/MC-241`, the shell updated to `Atelier Operations` while the task content still showed `North Star Lab` context and task data.

### 5. Sidebar counts do not appear workspace-scoped

Severity: Medium

Why it matters:
- The active workspace should be reflected consistently across navigation and counts.

Observed:
- After switching to `Atelier Operations`, the shell header showed `2 active projects`, but nav counters remained `Projects 12`, `Members 7`, `My Tasks 8`.

## Recommended Enhancements

### Priority 1

- Make workspace switching trigger a route-safe refresh or redirect so content cannot remain bound to the previous workspace.
- Scope shell counters to the active workspace.
- Fix duplicate keys in dashboard activity rendering.

### Priority 2

- Hide or replace the `Sign In` sidebar item for authenticated users.
- Add a real favicon and basic metadata asset coverage.

### Priority 3

- Improve search field affordance and command-entry polish in the top bar.
- Add a lightweight browser regression checklist around sign-in, workspace switching, task detail, and search.

## Artifacts Used

- Playwright CLI snapshots in `.playwright-cli/`
- Console logs in `.playwright-cli/console-*.log`

Most relevant artifacts:
- `.playwright-cli/console-2026-03-16T12-03-02-526Z.log`
- `.playwright-cli/page-2026-03-16T12-05-09-551Z.yml`
- `.playwright-cli/page-2026-03-16T12-05-11-115Z.yml`
