# Release v0.4

Date: 2026-04-30

## Summary

This release adds Mission Control’s first complete Constructor task-attachment workflow, including task-scoped upload, download, removal, stable task scope reuse across reruns, and cached upload-limit feedback in the task UI.

## Highlights

- Constructor-assigned tasks now expose a dedicated attachment surface backed by Mission Control proxy routes instead of direct browser access to Constructor.
- Mission Control now refreshes and caches Constructor capabilities server-side so the UI can show the current max upload size and block obviously too-large files before encoding.
- Constructor dispatch now resolves runtime configuration from the task’s owning workspace and reuses one stable `externalTaskId` per Mission Control task.
- The task workspace and shell received a cleanup pass to reduce side-rail noise and keep Constructor file actions in the main task flow.

## What changed

### Constructor task attachments
- Added Mission Control routes for Constructor task file list, upload, delete, and download.
- Kept Constructor as the source of truth for remote task files instead of mirroring them into Postgres.
- Preserved numeric upstream file ids during normalization so live Constructor file rows are not dropped.

### Upload-limit retrieval and safety
- Added `GET /api/workspaces/current/constructor/capabilities` to proxy Constructor capabilities through Mission Control.
- Added a small workspace-scoped server cache for Constructor capability snapshots.
- Surfaced the current max upload size in the Constructor attachment UI and blocked oversize files before base64 encoding.
- Added clean handling for upstream `413 task_file_too_large` responses when a cached limit is stale or bypassed.

### Task runtime and UX polish
- Dispatch now uses a stable `mc-task-<taskId>` scope plus a fresh idempotency key per intentional rerun.
- Constructor attachment actions moved into the main task workspace in a flatter attachment-style presentation.
- Bare URLs in rendered markdown are now linkified while preserving existing markdown links and code blocks.

### Regression coverage and docs
- Added focused tests for capabilities retrieval, task-file routes, task-file download/delete behavior, numeric file-id normalization, and related dispatch/runtime wiring.
- Updated the README, changelog, Constructor integration contract, and release metadata for the `v0.4` release.

## Validation

- `cd app && node --test tests/constructor-task-files-route.test.mjs tests/constructor-capabilities-route.test.mjs`
- `cd app && npm run ci:check`
- `cd app && npm run build`
- host-run service restart and `/api/health` returned `ok: true`
- browser verification on `/tasks/PROJET-T-017` confirmed visible max-size feedback in the Constructor attachment row

## Upgrade guidance

1. Update to `v0.4` using the normal update flow.
2. Verify `/api/health` after restart.
3. Open a Constructor-assigned task and confirm the attachment row shows the current max file size.
4. Upload a small file and confirm the file appears in the task attachment list.
5. Try a too-large file in a test environment and confirm the UI blocks it before upload.