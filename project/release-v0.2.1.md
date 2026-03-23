# Release v0.2.1

Date: 2026-03-23

## Highlights

This release turns the OpenClaw integration into a production-usable async task workflow and upgrades Mission Control into a clearer human-agent operations surface.

## What changed

### OpenClaw dispatch and task lifecycle
- Dispatch to OpenClaw is now async-first and returns acceptance immediately instead of waiting for a final answer.
- Accepted dispatches move tasks into `in_progress` right away.
- Completed agent work is now driven back into `review` consistently.
- Runtime task status transitions now honor scoped agent credentials correctly.
- Task detail now shows a dedicated OpenClaw activity area with live-ish refresh for active work.

### Human-agent UX improvements
- Queue is now a real first-class surface again and prioritizes human attention with clear sections like:
  - Needs review now
  - Waiting on human
  - May be stalled
  - Running normally
  - Ready to dispatch
- My Tasks now supports attention-first grouping in list mode when intervention is actually needed.
- Task detail now includes a review summary layer for agent work, with clearer next actions, evidence framing, and caveats.
- Task, queue, and list surfaces now share a consistent agent health/freshness model.
- Project task views now follow the same attention-first pattern and filtered board snapshots reflect the active filtered task set.

### Navigation, layout, and admin UX
- Queue was restored as a visible workspace destination instead of redirecting away.
- My Tasks view switching and saved-view behavior were clarified.
- Project, task, and settings layouts were simplified to reduce competing panels and visual noise.
- Members and workspace settings now have clearer empty, saving, and low-data states.
- Build/start scripts now automatically load the root deployment env so normal builds do not emit the earlier `DATABASE_URL` warning path.

## Operator notes

- Mission Control remains aligned with the current deployment model: host-run app, host-run OpenClaw, Dockerized PostgreSQL, and the host bridge service.
- The key implementation references for this release are:
  - `docs/openclaw-task-dispatch-implementation-spec.md`
  - `docs/human-agent-ux-implementation-spec.md`

## Recommended validation after upgrade

- Open a task and dispatch it to OpenClaw.
- Confirm the task moves to `In Progress` immediately.
- Confirm OpenClaw activity appears on task detail.
- Confirm completed work lands in `Review` with the review summary visible.
- Check Queue / My Tasks / a project page to confirm the new attention-first grouping is live.
