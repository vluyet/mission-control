# Mission Control cleanup plan — v0.2

## Intent

Mission Control should become a **small, clear, reliable core app** before it grows again.

Principle:

> start small → secure → grow when needed

This plan reduces UI noise, narrows the product surface, and simplifies the codebase around the main workflow.

---

## Product goal

A user should be able to:

1. sign in
2. open the active workspace
3. view projects
4. create and update tasks
5. open a task and discuss it
6. assign a human or an agent
7. link OpenClaw
8. dispatch a task to a linked agent

Everything else is secondary.

---

## Current issues observed

### Product / UX
- Too many top-level destinations for an app that is still early.
- Several screens mix overview, admin, and advanced operations at the same time.
- Empty states still feel heavy because the chrome and information density are high.
- Advanced concepts are visible before core workflow value is established.
- The app looks “big” before it feels “useful”.

### Codebase
- `src/lib/server-data.ts` is too central and carries too many responsibilities.
- `src/components/product/workspace-ui.tsx` contains many unrelated surfaces and patterns.
- Shell/navigation currently promotes too many areas too early.
- Advanced workspace/agent controls are interleaved with day-one workflows.

---

## Scope decision

### Tier A — keep in the core product
These should remain visible and fully supported.

- Sign in
- Workspace switcher
- Projects
- Task list / task detail
- Comments
- Task status transitions
- Member directory
- Human / agent assignment
- OpenClaw workspace linking
- OpenClaw task dispatch
- Minimal workspace settings

### Tier B — keep, but move behind settings or advanced sections
These can remain implemented but should not dominate the product.

- Workspace OpenClaw configuration
- Agent permissions editing
- Agent enable/disable toggles
- Workspace role editing
- Task attachments
- Execution feed
- Activity log
- Search
- Deployment/version metadata
- Project governance forms
- Project membership admin forms

### Tier C — hide, postpone, or remove from the default experience
These should leave the main path until the core product is strong.

- Queue as a first-class nav destination
- Standalone activity as a first-class nav destination
- Saved task views in the primary task experience
- Watchers as a primary task sidebar feature
- Rich multi-panel dashboard metrics on overview screens
- Large “operations” and “automation ready” marketing-style chrome
- Anything that requires explanation before delivering basic task value

---

## Route plan

### Keep as top-level routes
- `/projects`
- `/my-tasks`
- `/members`
- `/manage-workspace`

### Keep, but de-emphasize
- `/`
  - make it a very small workspace overview or redirect to `/projects`
- `/search`
  - keep technically, remove from primary nav
- `/activity`
  - keep technically, remove from primary nav

### Remove from primary navigation now
- `/queue`

### Suggested future route shape
- `/projects`
- `/my-tasks`
- `/members`
- `/settings` (rename from `/manage-workspace` later if desired)

---

## Shell cleanup plan

## File: `src/components/product/shell-layout.tsx`

### Problems
- The sidebar currently advertises too much product surface.
- “Core navigation” + “Operations” makes the app feel broader than it needs to be.
- Search, notifications, deployment pills, and active-task CTA all compete in the top bar.
- “Automation ready” footer adds noise without helping core work.

### Changes
1. Reduce sidebar nav to:
   - Projects
   - My Tasks
   - Members
   - Settings
2. Remove `Activity`, `Queue`, and `Search` from default nav.
3. Remove the “Operations” section entirely.
4. Remove the sidebar footer promo block.
5. Simplify the utility bar:
   - keep sign out
   - keep one primary contextual action if truly useful
   - move deployment metadata into settings or footer-level subtle text
6. Replace the global search bar with either:
   - a keyboard shortcut later, or
   - a minimal icon/button only when search has clear value

### Outcome
The app should feel like a focused task tool, not a control center dashboard.

---

## Workspace home / landing plan

### Problems
- The default workspace area likely carries too much summary information.
- Overview content competes with the actual work objects: projects and tasks.

### Changes
1. Make the default entry either:
   - redirect to `/projects`, or
   - show a tiny overview with only:
     - projects count
     - tasks needing attention
     - quick create project / task actions
2. Remove high-density metric strips unless they directly change user action.
3. Remove promotional or posture text that does not help a user take the next action.

### Recommendation
Short term: redirect `/` to `/projects`.

---

## Task experience cleanup

## File hotspot: `src/components/product/workspace-ui.tsx`

### Problems in task detail
The current task page tries to show too much at once:
- context
- success criteria
- task structure
- resolved context
- comments
- activity
- execution feed
- properties
- workflow controls
- attachments
- watchers
- tags
- quick links

That is too much for an early-stage core workflow.

### New task detail priority
#### Primary column
- title
- description
- status
- assignee
- due date
- comments

#### Secondary column
- dispatch action
- status actions
- minimal metadata

#### Collapsed or moved into advanced sections
- resolved context
- execution feed
- attachments
- watchers
- quick links
- large property blocks
- task structure details unless present

### Specific changes
1. Keep comments central.
2. Merge human/agent workflow controls into one clearer action area.
3. Show OpenClaw dispatch only when task is assigned to an enabled agent.
4. Move watchers and attachments below the fold or behind expandable panels.
5. Remove “success criteria” placeholder content if not generated from real data.
6. Remove “quick links” block.
7. Reduce task metadata to the smallest useful set.

---

## Members experience cleanup

### Problems
- The members screen currently feels like an admin console.
- Agent permissions and workspace role editing are too prominent.

### Changes
1. Keep a simple people/agents directory.
2. Default card content:
   - name
   - role
   - status
   - projects / capabilities summary
3. Move these to per-member advanced panels or edit flows:
   - workspace role editor
   - agent permissions editor
   - long policy explanation blocks
4. Keep enable/disable for agents if truly needed day-to-day.

---

## Workspace settings cleanup

### Current direction
`/manage-workspace` should become the place for advanced functionality, but in a progressive way.

### Target sections
1. **General**
   - workspace name
   - basic workspace info
2. **OpenClaw**
   - base URL
   - token status
   - sync agents
   - linked agents summary
3. **Members & permissions**
   - only advanced controls
4. **Advanced / danger**
   - credentials
   - assets
   - rarely used controls

### Rules
- Default settings page must be short.
- Advanced blocks should be collapsed or separated.
- No settings page should mix routine actions and dangerous actions without clear separation.

---

## Codebase cleanup plan

## 1. Split `src/lib/server-data.ts`

Target services:
- `src/lib/server/workspace-service.ts`
- `src/lib/server/project-service.ts`
- `src/lib/server/task-service.ts`
- `src/lib/server/member-service.ts`
- `src/lib/server/openclaw-service.ts`
- `src/lib/server/auth-event-service.ts`

### First extraction candidates
- workspace shell data
- project CRUD/query logic
- task CRUD/query logic
- OpenClaw sync/dispatch logic
- membership and assignment logic

## 2. Break up `workspace-ui.tsx`

Target structure:
- `src/components/product/core/page-header.tsx`
- `src/components/product/core/task-list.tsx`
- `src/components/product/core/task-detail.tsx`
- `src/components/product/core/project-list.tsx`
- `src/components/product/core/member-directory.tsx`
- `src/components/product/admin/activity-panel.tsx`
- `src/components/product/admin/openclaw-panels.tsx`
- `src/components/product/admin/permissions-panels.tsx`

### Rule
Core components should not import admin-only controls by default.

## 3. Create stronger feature boundaries

Suggested folders:
- `src/features/auth/*`
- `src/features/workspace/*`
- `src/features/projects/*`
- `src/features/tasks/*`
- `src/features/members/*`
- `src/features/openclaw/*`

This does not need to happen in one rewrite, but should guide new work.

---

## Security / reliability pass after simplification

After shrinking the app surface:

1. Validate host-runtime assumptions explicitly.
2. Keep Docker DB / host app model documented and tested.
3. Make OpenClaw integration configuration obvious and minimal.
4. Ensure safe defaults for agent permissions.
5. Add smoke tests for:
   - sign in
   - projects page
   - task detail page
   - OpenClaw sync
   - OpenClaw dispatch availability

---

## Proposed execution phases

## Phase 1 — Simplify shell and route prominence
- simplify `shell-layout.tsx`
- remove `queue`, `activity`, `search` from primary nav
- reduce top-bar clutter
- optionally redirect `/` to `/projects`

## Phase 2 — Simplify task detail
- reduce visible panels
- keep comments + actions + essential metadata
- move advanced panels behind disclosure sections

## Phase 3 — Simplify members and settings
- make members readable first, editable second
- restructure workspace settings into General / OpenClaw / Advanced

## Phase 4 — Code refactor
- split `server-data.ts`
- split `workspace-ui.tsx`
- remove dead component paths

## Phase 5 — Validation and cleanup
- smoke tests
- remove unused routes/components/helpers
- update docs to match the smaller product

---

## Immediate first implementation pass

### Safe first pass to execute now
1. Simplify sidebar navigation.
2. Remove queue/activity/search from default navigation.
3. Remove sidebar footer promo block.
4. Reduce utility bar clutter.
5. Make `/` redirect to `/projects`.
6. Keep advanced features reachable only through settings.

This gives the highest UX improvement for the smallest risk.

---

## Definition of done for the cleanup effort

Mission Control feels successful when:
- a first-time user understands where to go immediately
- empty states feel calm, not overwhelming
- advanced features do not dominate the experience
- the task flow is the center of gravity
- the app remains operationally correct with OpenClaw integration
- the code structure makes future growth easier instead of messier

---

## Notes for implementation

- Prefer hiding and de-emphasizing before deleting logic.
- Prefer smaller reviewable diffs.
- Preserve working integration behavior while simplifying UI.
- Remove dead code only after routes/components are clearly out of scope.
