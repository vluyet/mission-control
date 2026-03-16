# Backlog Additions

## 2026-03-16

### Proposed additions

1. `Context resolution service`
Priority: P1
Size: M

As a system, I want task context resolved from workspace context, project context, and task-specific overrides so that agents and humans operate from the same working frame.

Notes:
- should support deterministic merged context payloads
- should be reusable by API, UI, and future orchestration
- should remain simple and auditable

2. `Agent API reference explorer / export`
Priority: P1
Size: S

As an agent operator, I want a machine-readable API reference or export so that autonomous clients can discover contracts without scraping UI pages.

Notes:
- could be OpenAPI, JSON schema bundle, or a constrained internal contract format
- should include examples for comments, task reads, execution updates, and context resolution

3. `DB-backed UI reads`
Priority: P2
Size: M

As a user, I want routed UI pages to read from the seeded database instead of static demo modules so that the product behaves consistently across UI and API.

4. `Agent API credentials and scoped access`
Priority: P1
Size: M

As a workspace owner, I want scoped API credentials for agent clients so that autonomous access is safe, auditable, and revocable.

Notes:
- should support at least read/write scopes for tasks, comments, activity, and execution
- should be documented in the agent contract docs
- should avoid reusing the owner sign-in flow for machine clients

5. `Simple task and project mutation flows`
Priority: P1
Size: M

As a user, I want basic create and update flows for projects and tasks backed by the database so that the product becomes a working SaaS rather than a read-only shell.

Notes:
- keep scope tight: create project, create task, update core task metadata
- preserve the current simple task model
- align form payloads with future stable API resources

6. `Quick-add task entry from list and board views`
Priority: P2
Size: S

As a user, I want to create a task from the project task list or board without leaving the current work surface so that work capture stays fast.

Notes:
- should reuse the same constrained task-create payload
- should preserve project-member assignment rules
- should stay lightweight rather than becoming a complex inline editor

7. `Session expiry and re-auth UX`
Priority: P2
Size: S

As a workspace owner, I want clear session expiry and re-auth behavior so that protected access stays safe without becoming confusing.

Notes:
- should define cookie lifetime and remember-device behavior clearly
- should present a clean redirect or message on session expiry
- should remain compatible with future agent-specific credentials

8. `Auth event trail for owner and agent access`
Priority: P2
Size: S

As a workspace owner, I want sign-in and credential events logged so that access to the system remains auditable.

Notes:
- should cover owner sign-in and sign-out events
- should later extend to agent credential creation, rotation, and revocation
- should align with the app's audit-history model rather than inventing a separate log silo

9. `Workspace-scoped URLs and shareable workspace state`
Priority: P2
Size: M

As a user, I want workspace context reflected in shareable URLs or route structure so that navigation state is explicit and easier to share across sessions.

Notes:
- current workspace switching is intentionally cookie-backed to keep the product simple
- future work should consider explicit workspace route scopes without bloating the URL model
- should stay compatible with future agent orchestration and API contracts

10. `Actor-attributed agent mutations`
Priority: P1
Size: M

As a system, I want agent-triggered comments, execution updates, and task transitions to carry real actor attribution so audit history stays trustworthy.

Notes:
- current product logic is owner-authenticated and agent-friendly, but not yet truly actor-authenticated
- should align with future agent credentials and permission scopes
- should avoid trusting free-form actor names in mutation payloads once machine auth is introduced

11. `Mention notifications and inbox hooks`
Priority: P2
Size: M

As a collaborator, I want task mentions to be able to feed future notifications or inbox surfaces so that @mentions become operationally useful beyond text styling.

Notes:
- current mention support is intentionally lightweight and body-based
- future work should connect mentions to watchers, inboxes, or notification delivery without overcomplicating comments
- should remain consistent with the separation between comments, activity, and execution logs

12. `Search shortcuts and recent queries`
Priority: P2
Size: S

As a user, I want lightweight keyboard shortcuts and recent search memory so that global search becomes part of everyday product navigation instead of a one-off page.

Notes:
- current search is intentionally simple and workspace-scoped
- future work should consider slash-focus, recent queries, and quick-jump behavior without introducing a full command palette yet
- should stay compatible with the active-workspace model

13. `Attachment retention and deletion controls`
Priority: P2
Size: S

As a user, I want simple attachment cleanup controls and retention rules so task files stay useful without turning local storage into a junk drawer.

Notes:
- current attachment support is upload, listing, and download only
- future work should add delete/remove behavior plus safe cleanup of orphaned files
- should stay compatible with the Docker-local storage contract before any external blob system exists

14. `Artifact preview fallback states and unsupported-file UX`
Priority: P2
Size: XS

As a user, I want clearer empty, loading, and unsupported-file preview states so artifact inspection remains reliable instead of feeling broken when a file cannot render inline.

Notes:
- current preview support is intentionally lightweight and format-limited
- future work should add stronger preview messaging, icons, and fallback actions for unsupported files
- should remain compatible with Docker-local storage and not require an external preview service

15. `Actor-scoped project visibility enforcement`
Priority: P1
Size: M

As a system, I want project visibility rules enforced against a real acting member or agent identity so member-only projects are not just modeled in data but reliably hidden from unauthorized clients.

Notes:
- current project visibility is intentionally simple and owner-safe
- future work should enforce visibility on read APIs using real actor identity, not just workspace ownership
- should align with future scoped agent credentials and actor-attributed access

16. `Collapsed subtask groups in list and board views`
Priority: P2
Size: S

As a user, I want optional collapsing and grouping for parent and child tasks so richer task structure does not make list and board views feel noisy once projects grow.

Notes:
- current parent-child support is intentionally visible and flat
- future work should allow grouping without turning the product into a heavyweight planning tool
- should remain compatible with drag-and-drop and simple tag filtering

17. `Saved view sharing and default workspace views`
Priority: P2
Size: M

As a user, I want saved task views to be shareable or restorable across devices so useful review setups become part of the product and not just local browser state.

Notes:
- current saved views are intentionally lightweight and local-first
- future work should consider DB-backed saved views scoped to workspace or project context
- should stay compatible with agent-facing APIs if saved operational views become part of orchestration

18. `Workspace switch consistency and hard refresh behavior`
Priority: P1
Size: S

As a user, I want workspace switching to immediately refresh or redirect the current surface safely so the shell context and page content never point at different workspaces.

Notes:
- browser QA found a mixed-context state on task detail after switching workspaces
- future behavior should prefer a safe redirect or full data refresh over preserving a stale route
- this is especially important before agent orchestration relies on inherited context

19. `Workspace-scoped shell counters`
Priority: P1
Size: S

As a user, I want shell counts for projects, members, tasks, and queues to reflect the active workspace so navigation feedback remains trustworthy.

Notes:
- browser QA found header workspace data changing while nav counters stayed globally scoped or static
- should stay lightweight and not require a separate analytics layer

20. `Dashboard activity key stability and frontend warning cleanup`
Priority: P1
Size: XS

As a developer, I want activity rows rendered with stable unique keys so the dashboard stops emitting React warnings and list rendering remains reliable.

Notes:
- browser QA found duplicate-key warnings on dashboard load
- should include other obvious console-noise cleanup in the same pass when safe

21. `Authenticated shell navigation cleanup`
Priority: P2
Size: XS

As a signed-in user, I want auth navigation to reflect my current state so the shell feels coherent and does not show contradictory actions like `Sign In` and `Sign out` together.

Notes:
- browser QA found the signed-in shell still exposes a `Sign In` nav item
- should remain simple and not introduce a second auth menu system

22. `Workspace asset library and workspace-level files`
Priority: P1
Size: M

As a workspace owner, I want workspace-level files and reference assets managed from workspace administration so shared briefs, policies, and operating documents do not need to live on individual tasks.

Notes:
- the new manage-workspace surface now owns workspace settings and context
- workspace files are still only represented indirectly through task attachments
- future work should add upload, listing, and access rules for workspace-scoped assets

23. `Full OpenClaw Gateway device-auth integration`
Priority: P1
Size: L

As a workspace owner, I want Mission Control to connect directly to a remote OpenClaw Gateway so agent discovery does not rely on mounted config files or CLI wrappers.

Notes:
- launch-safe discovery is currently implemented through `openclaw.json` parsing or argv-based CLI execution
- official Gateway protocol requires device identity plus signed challenge handling
- future work should implement the protocol cleanly rather than approximating browser behavior

24. `Scheduled OpenClaw sync and drift alerts`
Priority: P2
Size: M

As a workspace owner, I want OpenClaw agent sync to run on a schedule and surface drift warnings so discovered agents stay aligned without relying on manual refreshes.

Notes:
- current sync is owner-triggered from `Manage Workspace`
- future work should report stale syncs and failed discovery clearly
- should stay compatible with both config-file and CLI discovery modes

25. `JSON5-safe OpenClaw config parsing`
Priority: P2
Size: S

As a workspace owner, I want Mission Control to safely parse real-world `openclaw.json` config files even when they use JSON5-style comments or trailing commas so config-file discovery matches OpenClaw behavior more closely.

Notes:
- current Mission Control config-file discovery uses standard JSON parsing
- OpenClaw operators may keep comments or trailing commas in local config files
- future work should avoid forcing operators to maintain a second sanitized copy unless they want to

26. `OpenClaw integration diagnostics and mount validation`
Priority: P2
Size: S

As a workspace owner, I want the OpenClaw panel to validate executable presence, config-path readability, and discovery-mode prerequisites before sync so setup errors are actionable instead of surfacing as raw process failures.

Notes:
- should detect cases like `spawn openclaw ENOENT` before a full sync attempt
- should verify that config paths exist inside the app container, not just on the host
- should stay lightweight and operator-oriented rather than becoming a full infrastructure console
