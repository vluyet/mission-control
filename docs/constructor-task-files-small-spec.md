# Constructor Upload Limit Retrieval Spec

## Status
Implemented in `v0.4`.

## Purpose
Define the smallest Mission Control spec required to retrieve the actual Constructor file upload size limit and display it in the frontend.

This spec is only about limit retrieval and display.

It does not define the full Constructor task-file feature.

## Goal
Before a user uploads a Constructor file from Mission Control, the frontend should know the current configured upload limit and show it clearly in the UI.

Mission Control should also use that value for client-side pre-validation.

## Scope
Implement only the following:

- fetch the current upload limit from Constructor
- expose that value safely to the Mission Control frontend
- display the limit in the upload UI
- reject obviously too-large files client-side before encoding/upload
- handle backend `413` responses cleanly if the client-side check is bypassed or stale

## Non-goals
Do not include any of the following in this work:

- full task-file upload UI spec
- input/output file list behavior
- generated output handling
- stable `externalTaskId` rules
- dispatch or callback behavior

## Upstream Constructor contract
Constructor exposes the upload limit through the authenticated public endpoint:

- `GET /api/v1/capabilities`

Expected upstream response shape:

```json
{
  "taskFiles": {
    "enabled": true,
    "uploadMaxBytes": 12582912,
    "uploadTransport": "json_base64"
  }
}
```

Field meaning:

- `taskFiles.enabled`: task-file support is available on the Constructor instance
- `taskFiles.uploadMaxBytes`: maximum decoded file size accepted by Constructor upload endpoints
- `taskFiles.uploadTransport`: current wire format used for uploads

## Mission Control server-side requirement
Mission Control must not call Constructor directly from the browser.

Mission Control should add one server-side route that proxies Constructor capabilities using the workspace's configured Constructor base URL and API token.

Implemented local route:

- `GET /api/workspaces/current/constructor/capabilities`

The server route should:

- load the workspace Constructor configuration
- call `GET <CONSTRUCTOR_BASE_URL>/api/v1/capabilities`
- pass the Constructor bearer token server-side
- return the capabilities payload to the frontend
- normalize auth and connectivity errors for frontend handling

## Frontend behavior
When a file-upload UI for Constructor is shown, the frontend should:

1. consume Mission Control's cached capability data for the current workspace or task file surface
2. read `taskFiles.enabled`
3. read `taskFiles.uploadMaxBytes`
4. show a human-readable limit, for example `12 MiB max`
5. reject files larger than `uploadMaxBytes` before base64 encoding or upload

The frontend should still handle server-side `413 task_file_too_large` responses in case:

- the limit changed after the page loaded
- the frontend check was bypassed
- the selected file size was miscomputed

## Display requirement
Mission Control should display the limit in the Constructor upload UI in at least one of these forms:

- `12 MiB max`
- `Max file size: 12 MiB`

Displaying both raw bytes and a human-readable value is acceptable, but the human-readable value is required.

## Error handling
Mission Control should show a clear UI state for these cases:

- Constructor integration is disabled for the workspace
- Constructor task-file support is not enabled
- Constructor credentials are missing or invalid
- Constructor is unavailable
- the selected file exceeds `uploadMaxBytes`
- Constructor rejects the upload with `413 task_file_too_large`

## Acceptance criteria

- Mission Control has a server-side route that retrieves Constructor capabilities for a workspace.
- The frontend can retrieve `taskFiles.uploadMaxBytes` without exposing Constructor credentials.
- The upload UI displays the current limit in human-readable form.
- The frontend blocks obviously too-large files before upload.
- The frontend still handles backend `413` responses gracefully.

## Implementation note
The shipped `v0.4` implementation keeps this slice narrow:

- Mission Control refreshes Constructor capabilities server-side and caches them per workspace for a short TTL
- the task file UI reuses the cached limit through `GET /api/tasks/:taskId/constructor/files` instead of refetching on every upload attempt
- the dedicated capabilities route remains available for explicit refresh and diagnostics