# Constructor Task Files Integration Ticket

## Status
Implemented in `v0.4` with a simplified attachment-style task UI.

Current release note:

- stable task-scoped `externalTaskId` handling is live
- Mission Control now proxies Constructor task-file list/upload/delete/download server-side
- Constructor task uploads use cached capability data for max-size feedback and pre-validation
- the current task page focuses on attachment-style input management; generated outputs remain available through the backend contract and follow-up UI work

## Goal
Add Mission Control support for Constructor task-scoped files so a user can:

- upload reusable input files to a Mission Control task
- dispatch Constructor runs that automatically reuse those files
- see generated output files after a run completes
- download both uploaded inputs and generated outputs from the task detail view

This must extend the current async Constructor integration. It must not introduce a second runtime path or bypass the existing Constructor public API flow.

## Product outcome
After this work, a Mission Control task that uses Constructor should have a dedicated Constructor Files surface with these behaviors:

- active input files are visible before dispatch
- users can upload new Constructor input files from the task detail page
- future Constructor dispatches for that task automatically reuse the active input set
- generated outputs appear after terminal completion and are downloadable from the same task detail page
- uploaded inputs can be removed from future runs without deleting historical outputs

## Important design choice
Do not merge this with existing Mission Control task attachments in the first pass.

For this pass, Constructor task files are a separate integration surface with separate semantics:

- Mission Control native attachments remain unchanged, but hidden from the UI
- Constructor task files are remote resources owned by Constructor
- generated outputs are not copied into Mission Control storage in this pass

## Scope
Implement all of the following:

1. stable `externalTaskId` handling per Mission Control task
2. server-side Mission Control routes that proxy Constructor task-file endpoints
3. task detail UI for Constructor input and output files
4. dispatch changes so reruns keep the same Constructor task scope
5. terminal refresh behavior so outputs appear after completion

## Non-goals
Do not do any of the following in this pass:

- do not change the existing Constructor callback ingress contract
- do not send files inline in `POST /api/v1/tasks`
- do not expose the Constructor API token to the browser
- do not build file version history or supersession metadata in Mission Control
- do not auto-import Mission Control native attachments into Constructor task files
- do not allow Mission Control to delete generated outputs
- do not add a new streaming or websocket dependency for this feature

## Upstream Constructor contract
Mission Control should use Constructor only through the public API.

Existing upstream calls already in use:

- `GET /api/v1/agents`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:bridgeExecutionId`
- `GET /api/v1/tasks/by-external/:externalTaskId`

New upstream calls for this work:

- `POST /api/v1/tasks/:externalTaskId/files`
- `GET /api/v1/tasks/:externalTaskId/files`
- `GET /api/v1/tasks/:externalTaskId/files/:taskFileId/download`
- `DELETE /api/v1/tasks/:externalTaskId/files/:taskFileId`

Constructor file semantics Mission Control must respect:

- files are scoped by `externalTaskId`, not by a single execution
- uploaded input files stay reusable until explicitly deactivated
- generated outputs are preserved by Constructor and returned through the same list/download surface
- generated outputs are immutable through the public API
- file list results can include files from multiple past executions under one task scope

## Required identifier behavior

### Stable task scope
Mission Control must stop generating a fresh `externalTaskId` for each dispatch.

Instead, each Mission Control task needs one stable Constructor task scope that survives reruns.

Recommended rule:

- `externalTaskId = mc-task-<taskId>`

Any equivalent deterministic and stable mapping is acceptable as long as it never changes for the lifetime of the Mission Control task.

### Execution identity
Mission Control must continue storing the accepted `bridgeExecutionId` for each dispatched run.

### Idempotency behavior
Mission Control must use:

- a fresh `idempotencyKey` for each intentional new dispatch
- the same `idempotencyKey` only when retrying the same submission after a client or transport failure

Do not reuse the same `idempotencyKey` for a user-initiated rerun.

## Mission Control server-side work

### 1. Add task-scoped Constructor file proxy routes
Add Mission Control server routes under the existing task/Constructor namespace.

Recommended local routes:

- `GET /api/tasks/:taskId/constructor/files`
- `POST /api/tasks/:taskId/constructor/files`
- `GET /api/tasks/:taskId/constructor/files/:fileId/download`
- `DELETE /api/tasks/:taskId/constructor/files/:fileId`

These routes should:

- resolve the workspace-specific Constructor base URL and API token from Mission Control settings
- resolve `taskId` to the stable Constructor `externalTaskId`
- proxy the upstream Constructor request and normalize errors for the UI
- keep Constructor credentials server-side only

The browser must never call Constructor directly.

### 2. Keep Constructor as the source of truth for file inventory
Do not create a first-pass Mission Control mirror table for remote Constructor files.

For this pass:

- list files by calling Constructor on demand
- download files by streaming from Constructor on demand
- treat Constructor responses as the canonical file metadata

If local caching is added later, it should be explicitly scoped as a follow-up task.

### 3. Update dispatch behavior
Current Mission Control dispatch behavior already uses `POST /api/v1/tasks` with callback support.

Change only the task-scope behavior:

- dispatch must now send the stable `externalTaskId`
- reruns of the same Mission Control task must keep the same `externalTaskId`
- existing callback flow stays unchanged

Constructor will handle file staging automatically when the same `externalTaskId` is reused.

### 4. Refresh file state on terminal completion
Mission Control already has polling and terminal callback handling.

Extend the integration so that when a Constructor run becomes terminal:

- the task detail view refreshes the Constructor file list
- generated outputs become visible without manual page reload when practical
- the UI remains correct even if only polling or only callback arrives first

Mission Control does not need to wait for the callback payload to include output metadata. It should refresh the file list from Constructor after terminal completion.

## Mission Control UI requirements

### Task detail surface
Add a dedicated `Constructor Files` section to task detail.

This section should be separate from:

- native task attachments
- workspace shared files
- execution log UI

### Inputs subsection
Show active uploaded Constructor task files.

For each input file, show at least:

- file name
- size
- media type when available
- created or updated time
- download action
- remove action

Provide an upload control in this section with reliable status, percentage completion and auto-update UI

### Outputs subsection
Show generated Constructor outputs separately from inputs.

For each output file, show at least:

- file name
- size
- media type when available
- created time
- download action
- the originating `creatorExecutionId` when available, either directly or through a grouped presentation

Outputs must be read-only in this pass.

### Empty states
The UI should explain these cases clearly:

- Constructor is not configured for this workspace
- Constructor integration is disabled
- no input files uploaded yet
- no outputs generated yet

### Loading and failure states
The file surface should handle:

- initial loading
- upload in progress
- delete in progress
- download in progress when applicable
- Constructor unavailable or unauthorized

Errors should be specific enough for an operator to tell whether the issue is local Mission Control config, Constructor availability, or a validation error.

## Behavior rules the UI must follow

### Uploaded input lifecycle
Deleting an input file from Mission Control should call Constructor's delete endpoint, which soft-deactivates the uploaded input.

That means:

- the file should stop appearing in the default active list
- the file should stop being used for future runs
- historical outputs from past runs must remain visible

### Generated output lifecycle
Generated outputs are immutable through the current Constructor public API.

Mission Control must not offer a delete action for generated outputs.

### Duplicate upload behavior
Constructor deduplicates uploads when the same task scope already has an active file with the same normalized file name and content hash.

Mission Control should expect:

- `201` for a newly stored file
- `200` for an exact deduplicated upload

### Replacement behavior
If a user uploads a file with the same logical name but different content, Constructor can store it as a distinct active input.

Mission Control should not pretend this is a true overwrite.

First-pass UI rule:

- do not implement smart replace
- allow upload as-is
- make it possible to remove the old input explicitly

If the UI exposes replacement language, it must explain that old active files may still exist until removed.

### Output accumulation behavior
Outputs can accumulate across multiple executions with the same `externalTaskId`.

Mission Control should therefore:

- separate outputs from inputs visually
- avoid implying the output list belongs only to the latest run
- ideally group or label outputs by `creatorExecutionId` or time

## Suggested task state integration
This feature should fit the current Mission Control Constructor lifecycle.

Recommended behavior:

- when dispatch is accepted, leave the file list visible and unchanged
- while task status is `In Progress`, keep using the current status polling behavior
- when polling or callback marks the run terminal, refresh the Constructor file list
- if the task transitions to `In Review`, make sure newly generated outputs are visible there

## Suggested upload request shape
Mission Control should send JSON to its own server route and then proxy upstream to Constructor in the same shape.

Expected body:

```json
{
  "fileName": "brief.txt",
  "contentBase64": "QnJpZWYgY29udGVudA==",
  "contentType": "text/plain"
}
```

Do not introduce multipart upload unless there is a separate product reason to do so. Constructor's current public API is JSON with base64 content.

## Acceptance criteria

### Core integration
- A Mission Control task has one stable Constructor `externalTaskId` that survives reruns.
- Dispatching the same Mission Control task again reuses the same `externalTaskId` and therefore the same active Constructor input set.
- Mission Control still creates a fresh `idempotencyKey` for each intentional new dispatch.

### File operations
- A user can upload an input file from task detail.
- Uploaded Constructor inputs appear in the task detail file list.
- A user can download an uploaded input file from Mission Control.
- A user can remove an uploaded input file from future runs.
- Removing an input does not remove generated outputs.

### Output visibility
- After a Constructor run completes and writes outputs, Mission Control refreshes the file list and shows generated outputs.
- Generated outputs are downloadable from task detail.
- Generated outputs do not show a delete action.

### Separation from native attachments
- Existing Mission Control task attachments continue working unchanged.
- Constructor files are presented as a distinct section and not mixed into the native attachment list.

### Failure handling
- If Constructor is disabled or misconfigured for the workspace, the file UI shows a clear disabled state.
- If Constructor returns an error for upload, list, delete, or download, the UI surfaces an actionable error state.

## QA scenarios

1. Upload one input file, dispatch a run, confirm the file remains visible before and after completion.
2. Dispatch a second run for the same Mission Control task and confirm the input file is reused without re-upload.
3. Confirm generated outputs appear after terminal completion.
4. Download both an uploaded input and a generated output.
5. Remove the uploaded input and confirm it no longer appears in the active list.
6. Confirm old generated outputs still remain after input removal.
7. Upload the same exact file twice and confirm the second upload deduplicates cleanly.
8. Upload a same-name file with different content and confirm both inputs can exist until one is removed.
9. Confirm a workspace without valid Constructor config shows a disabled or unavailable state instead of broken controls.

## Suggested follow-up work, explicitly out of this ticket
- merge or relate native Mission Control attachments with Constructor task files
- local caching or persistence of remote Constructor file metadata
- true replace/supersede UX for input files
- bulk download or zip export
- file preview UI
- output-to-comment or output-to-attachment import shortcuts

## Notes for implementation
This ticket should be implemented as a Mission Control extension of the current Constructor public API integration, not as a new product subsystem.

Prefer the smallest end-to-end slice that gives a working task detail flow:

1. stable `externalTaskId`
2. server-side file proxy routes
3. task detail file list and upload
4. terminal refresh to show outputs

Keep the existing callback and status-polling model intact.