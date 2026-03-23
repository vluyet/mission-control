# Human-Agent UX Implementation Spec

## Status
In implementation

## Current implementation notes
Completed in this pass:
- shared agent run health/freshness helper introduced for consistent labels across task and queue surfaces
- task detail now includes a review summary panel for `In Review`, `Blocked`, and agent-completed `Done` tasks so historical lifecycle inconsistencies do not hide the review layer
- queue now emphasizes `Needs review now`, `Waiting on human`, and `May be stalled`
- task and queue rows expose agent health labels/details instead of status alone
- task status action copy is now more state-aware, with one stronger primary action

Still to refine in follow-up passes:
- apply the same attention-first grouping to My Tasks where it improves scanning without adding noise
- package stronger evidence/validation summaries when richer backend data becomes available
- continue screenshot-led density reduction on list headers and top metric strips

## Purpose
Define the next UX phase for Mission Control now that async OpenClaw dispatch and task lifecycle handling are working.

This spec is intentionally scoped to **fill the highest-value human interaction gaps without undoing the foundation already built**.

It should be used as the reference for the next implementation passes.

---

## Background
Mission Control now has a solid operational base:
- async-first OpenClaw dispatch
- immediate task acceptance feedback
- task lifecycle updates (`todo`/`current` -> `in_progress` -> `review`)
- queue surface
- task activity visibility
- cleaner project, settings, and task-detail page structure

The next product problem is no longer "can the agent run?"

It is:
- can a human understand what is happening?
- can a human decide what to do next quickly?
- can a human review agent work safely?
- can a human intervene when work goes stale, blocked, or ambiguous?

This phase should make Mission Control feel less like a task database and more like a **human-agent operations cockpit**.

---

## Product goal
Improve the **human control loop** across Mission Control:

1. understand current state
2. detect what needs attention
3. review agent output efficiently
4. intervene safely when needed
5. trust the workflow because it is visible and recoverable

---

## Non-goals
This phase should **not** attempt a full redesign.

Do not:
- replace the current information architecture wholesale
- introduce a completely new task model
- replace the existing dispatch flow
- require websockets or major real-time infrastructure by default
- turn the app into a chat-first experience
- rebuild all surfaces at once

This is a targeted UX upgrade phase.

---

## UX principles for this phase

### 1. Summary first
Humans should see the outcome and next decision before raw logs.

### 2. Decision-oriented pages
Each page should make the next safe action obvious.

### 3. Human review is first-class
Agent-completed work should not be buried inside generic task detail UI.

### 4. Visibility over magic
Humans should see ownership, freshness, risk, and blockers clearly.

### 5. Calm hierarchy
One dominant purpose per page. Secondary signals should stay secondary.

### 6. Safe intervention
Humans should be able to redirect work without digging through system internals.

---

## Primary gaps to close

### Gap 1: No dedicated review UX for agent-completed work
Current task detail supports inspection, but not a lightweight review workflow.

### Gap 2: Queue is useful but not yet a strong human decision surface
It still behaves more like a task list than a review/intervention surface.

### Gap 3: Freshness and liveness signals are too weak
A task can be `in_progress`, but the human still may not know whether the run is healthy, stale, or waiting.

### Gap 4: Intervention paths are not emphasized enough
The system can dispatch well, but humans need clearer ways to steer exceptions.

### Gap 5: Task detail still needs stronger mode separation
Conversation, execution, review, and metadata should feel more distinct.

---

## Scope of implementation
This phase should focus on four surfaces:

1. **Task detail**
2. **Queue**
3. **My Tasks**
4. **Project task surfaces where status/review context appears**

Settings and navigation should only be touched when needed to support the above.

---

# Workstream A — Review UX

## Objective
Make agent-completed work easy to review quickly and safely.

## Product requirement
When a task owned by an agent reaches `review`/`in review`, the task detail page should expose a dedicated **review summary** section above lower-level evidence/log surfaces.

## Review summary content
The review summary should answer:
- what was the goal?
- what did the agent complete?
- what is the latest meaningful outcome?
- what evidence exists?
- what remains uncertain?
- what decision should the human make now?

## Proposed component
`TaskReviewSummaryPanel`

### Inputs
- task title
- task description or short objective
- current status
- latest execution summary
- latest completion comment when available
- counts / presence of evidence
- validation state when available
- blockers / caveats when present

### Initial presentation
Compact card with:
- **Outcome**
- **Latest meaningful update**
- **Evidence available**
- **Risks / caveats**
- **Recommended next step**

### Recommended first version
Even without a richer backend evidence model, derive this panel from existing task fields and execution data.

Use simple heuristics first:
- latest comment from agent or system -> latest outcome summary
- execution feed count -> evidence signal
- blocked reason / failure text -> caveat signal
- task status -> recommended next action

## Review actions
When task is in review, make these actions visible and grouped:
- `Approve / Mark done`
- `Request changes`
- `Re-dispatch with note`
- `Mark blocked`

If all actions cannot be fully implemented server-side yet, at minimum:
- expose the actions in the UI
- wire what already exists
- clearly mark deferred actions if needed

## Acceptance criteria
- A review-ready task clearly presents a review summary before logs.
- A human can identify the intended decision in under a few seconds.
- Review actions are grouped and visibly distinct from normal task metadata.

---

# Workstream B — Queue as a human decision surface

## Objective
Make `/queue` the operational surface for human attention, not just agent-owned task listing.

## Product requirement
Queue should prioritize tasks by **human attention need**, not only by generic status.

## New emphasis model
Queue should visually separate at least these groups:
- **Needs review now**
- **Blocked and waiting on human**
- **Stale active runs**
- **Running normally**

## First-pass implementation approach
Keep the existing page structure, but:
- add stronger grouping labels or sections
- move highest-attention groups above generic active lists
- add clearer state chips or helper labels

## Suggested task signals on queue rows/cards
Add compact secondary lines or badges for:
- last update age
- waiting on human
- no recent progress
- ready for review
- blocked by missing context
- validation failed/passed (future-friendly)

## Suggested heuristics
These can initially be derived from timestamps and task status:
- **stale**: `in_progress` and no meaningful update for threshold window
- **needs review**: task status `review` / `in review`
- **waiting on human**: blocked tasks or tasks with explicit blocker text
- **running normally**: active and fresh

Thresholds should be conservative and visible in code, e.g.:
- `fresh` < 10 min
- `aging` 10–30 min
- `stale` > 30 min

Adjust after real usage.

## Acceptance criteria
- The queue clearly tells a human what needs attention first.
- Review-ready and blocked-on-human tasks stand out above generic running work.
- Stale runs are visible without opening each task.

---

# Workstream C — Freshness and liveness signals

## Objective
Make the health of agent work obvious.

## Product requirement
A human should be able to tell whether an agent task is:
- active and healthy
- quiet but acceptable
- potentially stalled
- blocked
- completed and awaiting review

## Initial UI language
Prefer human-readable labels such as:
- `Updated just now`
- `Updated 6m ago`
- `Quiet for 18m`
- `May be stalled`
- `Waiting on input`
- `Ready for review`

## Surfaces to update
- task detail right rail / agent run panel
- queue rows/cards
- my tasks rows/cards where agent-owned work appears

## Recommended implementation
Create a shared small helper/model, e.g.:
- `getAgentRunHealth(...)`
- returns label + severity + freshness bucket

Possible buckets:
- `fresh`
- `aging`
- `stale`
- `blocked`
- `review`
- `idle`

## Acceptance criteria
- Agent work never feels stateless while active.
- Users can distinguish healthy in-progress work from stale in-progress work.
- The same health language is reused consistently across surfaces.

---

# Workstream D — Intervention UX

## Objective
Make exception handling obvious and safe.

## Product requirement
Humans should have clear intervention paths when agent work is not progressing or needs correction.

## Intervention actions to emphasize
Short term:
- `Add context`
- `Re-dispatch`
- `Mark blocked`
- `Move back to todo`
- `Take over manually`

Later / optional:
- `Pause run`
- `Stop run`
- `Request progress summary`
- `Escalate`

## UI strategy
Do not flood the default task view with all actions equally.

Instead:
- keep one primary action based on current state
- show secondary intervention actions in a quieter grouped area

Example by state:
- **Todo / agent-owned** -> primary: `Dispatch to OpenClaw`
- **In progress + healthy** -> primary: none, secondary: `Add context`, `Mark blocked`
- **In progress + stale** -> primary: `Re-dispatch` or `Add context`
- **Blocked** -> primary: `Resolve blocker`
- **In review** -> primary: `Approve / Mark done`

## Acceptance criteria
- Humans can see what to do when a run goes wrong.
- Intervention actions are state-aware rather than static.
- UI avoids exposing raw system complexity as the main control model.

---

# Workstream E — Stronger mode separation in task detail

## Objective
Make task detail easier to parse by separating discussion, execution, review, and metadata.

## Product requirement
Task detail should clearly communicate which layer the human is looking at:
- collaboration
- live execution
- review decision
- reference details

## Recommended layout refinement
Keep the current broad structure, but strengthen order and emphasis:

### Main column
1. task header
2. review summary (only when relevant)
3. team conversation
4. lower-emphasis technical evidence/logs when needed

### Right rail
1. summary / ownership
2. next actions
3. agent run state
4. details / metadata

## Additional refinements
- keep raw execution feed visually quieter than final review summary
- avoid duplicating the same status in too many places
- prefer one strong latest-update block over multiple similar status blurbs

## Acceptance criteria
- Users can distinguish conversation from execution status at a glance.
- Review-oriented tasks feel different from ordinary todo tasks.
- The page supports quick judgment before deep inspection.

---

## Copy and labeling guidance

### Prefer
- `Needs review`
- `Waiting on human`
- `Latest meaningful update`
- `Ready to approve`
- `No recent progress`
- `Recommended next step`
- `Agent health`

### Avoid when possible
- vague system wording like `processing`
- duplicated headings saying the same thing
- labels that reflect internals more than human decisions

---

## Delivery plan

### Phase 1 — Fastest high-value improvements
1. add review summary block on task detail
2. add shared freshness/health model
3. improve queue emphasis for review/blocked/stale
4. tune task-detail action hierarchy for review and intervention

### Phase 2 — Follow-up polish
1. apply health/freshness consistently to My Tasks
2. reduce metric-card noise on queue and My Tasks
3. refine task-detail header density
4. improve evidence presentation when available

### Phase 3 — Future-friendly extensions
1. structured evidence bundle model
2. validation status model
3. richer review workflow states (`changes_requested`, etc.)
4. optional dedicated review mode/screen

---

## Suggested implementation order in code

### First files to inspect/change
- `app/src/components/product/task-workspace.tsx`
- `app/src/app/(workspace)/queue/page.tsx`
- `app/src/app/(workspace)/my-tasks/page.tsx`
- `app/src/components/product/workspace-ui.tsx`
- supporting task-view / data helpers as needed

### Likely new helpers/components
- `task-review-summary.tsx` or local review-summary component
- shared `agent-run-health` helper
- queue grouping helpers derived from status + update timestamps

---

## Validation plan
Use browser-driven validation at desktop size as the main UX check.

### Target viewport
- `1920x1080`

### Screens to validate after each pass
- `/queue`
- `/my-tasks`
- `/tasks/[taskId]`
- `/projects/[slug]/tasks/[taskId]`
- `/projects/[slug]` when task status summary changes affect project surfaces

### What to validate
- next action is obvious
- review tasks stand out
- stale/healthy distinctions are understandable
- task detail supports quick decision-making
- page hierarchy remains calm and uncluttered

---

## Success criteria for this UX phase
Mission Control should feel materially closer to a state-of-the-art human-agent app when:
- humans can review agent work without reading full logs first
- queue clearly tells humans what needs action now
- in-progress agent work exposes health/freshness clearly
- intervention paths are obvious when work stalls or blocks
- task detail supports fast trust decisions, not just inspection

---

## One-sentence guiding principle
**Mission Control should optimize for delegation clarity, review speed, and safe human intervention — not just task storage and agent dispatch.**
