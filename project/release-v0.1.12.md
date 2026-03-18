# Release v0.1.12

Date: 2026-03-18

## Highlights

- OpenClaw dispatch simplified to `/hooks/agent` with proper hooks-token authentication.
- Runtime scoped agent bearer credentials are now issued per dispatch for autonomous handling.
- Dispatch prompts now include Mission Control API callback instructions (`/execution`, `/comments`).
- Hook response text is persisted to task comments when returned synchronously.
- Dispatch execution logs include response payload previews for faster debugging.

## Operational notes

- Ensure `OPENCLAW_HOOKS_TOKEN` is set in Mission Control and matches OpenClaw hooks token.
- Autonomous agents should use provided bearer token to write execution logs and final comments.
