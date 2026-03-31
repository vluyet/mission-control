# Release v0.2.3

Date: 2026-03-31

## Summary

This release stabilizes Mission Control’s OpenClaw bridge integration for real persistent workspaces and fixes task creation failures caused by task ID collisions.

## Highlights

- OpenClaw agent discovery now correctly resolves real agents through the host bridge.
- Bridge agent sync now merges direct agent listing with session-derived discovery so `main` and `nova` are both surfaced reliably.
- Mission Control task creation no longer fails in persistent workspaces due to reused `Task.id` prefixes.
- OpenClaw compatibility and regression coverage were updated for bridge-first discovery and webhook normalization.
- Host bridge behavior is now documented more clearly for operators.

## What changed

### OpenClaw bridge and sync
- Mission Control now prefers bridge `GET /agents` for discovery.
- Compatibility fallback remains in place for older invocation paths.
- The host bridge now unions primary discovery results with agent IDs derived from `sessions.list`, avoiding incomplete agent sync when the primary source is partial.
- Real workspace sync now correctly aligns with the actual OpenClaw agents instead of stale historical test-only rows.

### Task creation reliability
- Task ID generation now uses a project-specific stable slug-derived prefix.
- New task IDs are generated from the next matching global suffix instead of reusing short shared prefixes.
- This fixes `Task.id` uniqueness collisions in long-lived workspaces with repeated project names.

### Test and documentation updates
- OpenClaw tests were updated to match bridge-first discovery.
- Added webhook payload normalization coverage.
- Auth/task tests were made resilient to persistent workspace state.
- Host bridge documentation now reflects the current discovery behavior.

## Validation

- `npm run test` passes
- OpenClaw sync resolves the real agents `main` and `nova`
- Task creation returns `201` successfully for newly created projects

## Upgrade guidance

1. Update to `v0.2.3` using the normal update flow.
2. Verify `/api/health` after restart.
3. Open workspace settings and confirm OpenClaw sync lists only the expected real agents.
4. Create a new task inside a project and confirm it succeeds without server error.
