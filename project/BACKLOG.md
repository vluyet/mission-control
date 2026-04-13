# Mission Control Backlog (Single Source of Truth)

Last updated: 2026-03-18

This file replaces legacy backlog files and is the canonical backlog view.

## Current focus (active)

### 1) Actor-scoped project visibility enforcement
- Priority: P1
- Why: visibility rules are modeled but not fully enforced by acting identity.
- Done when:
  - project read APIs enforce visibility by resolved actor (owner/agent)
  - unauthorized project/task data is not returned
  - coverage exists for owner + scoped agent behaviors

### 2) Workspace-scoped URLs and shareable workspace state
- Priority: P2
- Why: improve deterministic navigation and shareability.
- Done when:
  - active workspace can be represented in URL or route state safely
  - direct links open in the intended workspace context
  - stale workspace/task route mismatches are prevented

### 3) Workspace switch consistency + hard-refresh safety
- Priority: P1
- Why: avoid mixed-context UI after switching workspace.
- Done when:
  - switching workspace always refreshes/reconciles context safely
  - shell counters and page data stay in the same workspace

---

## Near-term queue

### 4) Saved view sharing and default workspace views
- Priority: P2

### 5) Search shortcuts and recent queries
- Priority: P2

### 6) Quick-add task entry from list and board views
- Priority: P2

### 7) Collapsed subtask groups in list and board views
- Priority: P2

---

## Reliability / platform queue

### 8) Component test coverage (K2 follow-up)
- Priority: P1
- Note: route/event tests exist; component-level coverage is still shallow.

### 9) Attachment retention and deletion controls
- Priority: P2

### 10) Mention notifications and inbox hooks
- Priority: P2

### 11) Generalized external agent provider abstraction (post-Constructor integration)
- Priority: P2

---

## Constructor runtime hardening

### 12) Constructor callback observability and recovery
- Priority: P1

### 13) Callback-path regression coverage
- Priority: P1

---

## Recently completed (high signal)

- Constructor workspace link + public API agent sync
- Constructor task dispatch via `POST /api/v1/tasks`
- Constructor callback comment projection and duplicate suppression
- Constructor status polling and local task lifecycle sync
- Scoped agent credentials for Mission Control APIs
- Dispatch payload/status logging improvements
- CI stabilized for the current Constructor contract

