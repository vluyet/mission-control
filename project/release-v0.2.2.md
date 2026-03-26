# Release v0.2.2

Date: 2026-03-26

## Summary

This release improves day-to-day task operations by clarifying communication surfaces and hardening startup/runtime behavior. The result is a more predictable workflow for both humans and agents.

## Highlights

- Task communication now focuses on two clear surfaces:
  - comments for human/agent discussion
  - timeline for operational events and lifecycle monitoring
- Timeline event semantics are standardized so operators and automations can reason about state transitions:
  - `Task dispatched`
  - `Agent accepted task`
  - `Agent retrieved context`
  - `Agent finished task`
  - comment add/edit/delete events
- OpenClaw prompt workflow was tightened to reduce noisy periodic logging and favor explicit lifecycle signals.
- Comment composer behavior was hardened for UX reliability:
  - immediate submit feedback
  - disabled/loading controls while submitting
  - optimistic comment updates
  - clearer validation and error/success signaling
- Runtime startup reliability improved with a DB preflight script used by host service startup to avoid booting against an unavailable database.

## Developer Notes

- The timeline is now the primary machine-readable stream for task-level operational monitoring.
- The explicit lifecycle labels are intended to remain stable for future automation, alerting, and analytics.
- For host installs, startup sequencing now assumes DB availability is checked before app process launch.

## Upgrade Guidance

1. Update to this release using the standard update flow.
2. Verify `/api/health` after restart.
3. Open a task and confirm:
   - comment posting feedback is immediate
   - timeline shows lifecycle and comment action events as expected.
