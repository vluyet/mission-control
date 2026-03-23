import Link from "next/link";
import { AttachmentRecord, Comment, ContextBlock, TaskRecord, TimelineEvent } from "@/lib/demo-data";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import { AppButton, Panel, PanelHeader, PriorityBadge, StatusBadge } from "@/components/ui/primitives";
import { TaskCommentsPanel } from "@/components/product/task-comments-panel";
import { TaskStatusActions } from "@/components/product/task-status-actions";
import { TaskOpenClawDispatchButton } from "@/components/product/task-openclaw-dispatch-button";

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="property-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function getHumanDecisionGuidance(task: TaskRecord, agentHealthLabel?: string) {
  if (task.status === "In Review") {
    return {
      title: "Approve or request another pass",
      detail: "Start with the review summary, then either approve the result or send it back with a short correction note."
    };
  }

  if (task.status === "Blocked") {
    return {
      title: "Resolve the blocker",
      detail: task.blockedReason || "Add the missing context or choose the safest next state before asking the agent to continue."
    };
  }

  if (task.assigneeType === "Agent" && task.status === "In Progress") {
    return {
      title: agentHealthLabel === "May be stalled" ? "Check the quiet run" : "Let the run continue unless you need to steer it",
      detail:
        agentHealthLabel === "May be stalled"
          ? "No recent progress signal is visible. Add context, re-dispatch, or mark the task blocked if the agent is waiting on you."
          : "The agent is still working. Intervene only if you need to redirect scope, add context, or capture a blocker."
    };
  }

  if (task.assigneeType === "Agent" && task.status === "Todo") {
    return {
      title: "Dispatch when the task is ready",
      detail: "Confirm the task context is complete, then send it to OpenClaw to start execution."
    };
  }

  return {
    title: "Move the task forward deliberately",
    detail: "Use the workflow controls below to reflect the next real state instead of leaving ambiguity in the task."
  };
}

function formatReviewSignal(line: string) {
  const normalized = line.trim();

  if (!normalized) return null;

  if (normalized.startsWith("OpenClaw dispatch response:")) {
    return "OpenClaw accepted the run and returned a final response.";
  }

  if (normalized.length > 280) {
    return `${normalized.slice(0, 277)}...`;
  }

  return normalized;
}

function TaskReviewSummary({
  task,
  comments,
  executionFeed,
  attachments,
  latestExecutionAt
}: {
  task: TaskRecord;
  comments: Comment[];
  executionFeed: string[];
  attachments: AttachmentRecord[];
  latestExecutionAt?: string;
}) {
  if (!["In Review", "Blocked", "Done"].includes(task.status) || task.assigneeType !== "Agent") return null;

  const latestHumanOrAgentComment = comments.find((comment) => comment.tone === "agent" || comment.role !== "System");
  const formattedExecutionFeed = executionFeed.map(formatReviewSignal).filter((line): line is string => Boolean(line));
  const latestUpdate = formattedExecutionFeed[formattedExecutionFeed.length - 1] ?? latestHumanOrAgentComment?.body ?? "No completion summary was recorded yet.";
  const recentExecutionLines = formattedExecutionFeed.slice(-3).reverse();
  const evidence = [
    executionFeed.length ? `${executionFeed.length} execution ${executionFeed.length === 1 ? "update" : "updates"}` : null,
    comments.length ? `${comments.length} conversation ${comments.length === 1 ? "entry" : "entries"}` : null,
    attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : null
  ].filter(Boolean);
  const checkpointTitle =
    task.status === "In Review"
      ? "Human decision required"
      : task.status === "Blocked"
        ? "Blocked and waiting on input"
        : "Completed with final evidence";
  const recommendedNextStep =
    task.status === "In Review"
      ? "Approve if outcomes match the goal, otherwise leave a short correction comment and mention the agent."
      : task.status === "Blocked"
        ? "Unblock with missing context or scope changes, then set back to in progress."
        : "Confirm acceptance criteria and close if no follow-up is needed.";

  return (
    <Panel tone="subtle" className="mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Review checkpoint</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{checkpointTitle}</h3>
        </div>
        <StatusBadge value={task.status} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Recommended action</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{recommendedNextStep}</p>
        {latestExecutionAt ? <p className="mt-3 text-xs text-[var(--text-dim)]">Last agent update: {latestExecutionAt}</p> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr),minmax(0,0.75fr)]">
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Latest signal</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-muted)]">{latestUpdate}</p>
          {recentExecutionLines.length > 1 ? (
            <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
              {recentExecutionLines.slice(1).map((line, index) => (
                <p key={`${index}-${line}`} className="text-sm text-[var(--text-dim)]">• {line}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Evidence</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {evidence.length ? evidence.map((item) => (
              <span key={item} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-strong)]">{item}</span>
            )) : <span className="text-sm text-[var(--text-muted)]">No structured evidence yet.</span>}
          </div>
          {task.blockedReason ? <p className="mt-3 text-sm text-rose-700">Blocker: {task.blockedReason}</p> : null}
        </div>
      </div>
    </Panel>
  );
}

export function TaskWorkspace({
  task,
  comments,
  timeline,
  executionFeed,
  executionMeta,
  attachments = [],
  childTasks = [],
  resolvedContext,
  watchers = [],
  availableWatchers = [],
  compact = false
}: {
  task: TaskRecord;
  comments: Comment[];
  timeline: TimelineEvent[];
  executionFeed: string[];
  executionMeta?: {
    latestStatus?: string;
    latestCreatedAt?: string;
    latestUpdatedAt?: string;
  };
  attachments?: import("@/lib/demo-data").AttachmentRecord[];
  childTasks?: Array<{ id: string; title: string; status: string }>;
  resolvedContext: {
    task: ResolvedTaskContext;
    workspace: ContextBlock;
    project?: ContextBlock;
  } | null;
  watchers?: import("@/lib/demo-data").WatcherRecord[];
  availableWatchers?: import("@/lib/demo-data").WatcherRecord[];
  compact?: boolean;
}) {
  const agentHealth = getAgentRunHealth(task, executionMeta?.latestUpdatedAt ?? task.updatedAt);
  const openClawFreshness = agentHealth.detail;
  const openClawState = agentHealth.label;
  const decisionGuidance = getHumanDecisionGuidance(task, openClawState);
  const latestExecutionLine = executionFeed[executionFeed.length - 1] ?? null;
  const taskSignals = [
    task.project ? `Project ${task.project}` : null,
    task.effort ? `Effort ${task.effort}` : null,
    task.due ? `Due ${task.due}` : null,
    watchers.length ? `${watchers.length} watcher${watchers.length === 1 ? "" : "s"}` : null
  ].filter(Boolean);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Task detail"
        title={task.title}
        action={
          <div className="flex flex-wrap gap-2">
            <AppButton tone="primary" href={`/tasks/${task.id}/edit`}>
              Update task
            </AppButton>
          </div>
        }
      />
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1.3fr),320px]" : "xl:grid-cols-[minmax(0,1.55fr),320px]"}`}>
        <div className="border-b border-[var(--line)] p-5 xl:border-b-0 xl:border-r">
          <section className="rounded-3xl border border-[var(--line)] bg-white px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-eyebrow">Task state</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge value={task.status} />
                  <PriorityBadge value={task.priority} />
                </div>
              </div>
              {taskSignals.length ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {taskSignals.map((signal) => (
                    <span key={signal} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-dim)]">
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {task.description ? (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Goal and brief</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-[var(--text-strong)]">{task.description}</p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Owner</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">{task.assignee}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Reviewer</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">{task.reviewer ?? "Unassigned"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Type</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">{task.assigneeType}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Due</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">{task.due}</p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Next action</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--text-strong)]">{decisionGuidance.title}</h3>
              </div>
              <StatusBadge value={task.status} />
            </div>
            {task.blockedReason ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                {task.blockedReason}
              </div>
            ) : null}
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <TaskStatusActions
                taskId={task.id}
                currentStatus={task.status}
                blockedReason={task.blockedReason}
                actorType="human"
                title="Workflow controls"
                options={task.humanTransitionOptions ?? []}
              />
            </div>
          </section>

          {task.parentTaskTitle || childTasks.length ? (
            <section className="mt-5 rounded-3xl border border-[var(--line)] bg-white px-5 py-5">
              <p className="section-eyebrow">Task structure</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Parent</p>
                  {task.parentTaskTitle ? (
                    <Link href={`/tasks/${task.parentTaskId}`} className="mt-3 inline-flex rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">
                      {task.parentTaskTitle}
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">No parent task.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Subtasks</p>
                  {childTasks.length ? (
                    <div className="mt-3 space-y-2">
                      {childTasks.map((child) => (
                        <Link key={child.id} href={`/tasks/${child.id}`} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm hover:border-[var(--line-strong)]">
                          <span className="font-medium text-[var(--text-strong)]">{child.title}</span>
                          <StatusBadge value={child.status} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">No subtasks yet.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <TaskReviewSummary
            task={task}
            comments={comments}
            executionFeed={executionFeed}
            attachments={attachments}
            latestExecutionAt={executionMeta?.latestUpdatedAt}
          />

          <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
            <PanelHeader
              eyebrow="Task communication"
              title="Comments and timeline"
            />
            <TaskCommentsPanel
              taskId={task.id}
              comments={comments}
              timeline={timeline}
              mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
            />
          </section>
        </div>

        <aside className="space-y-4 p-5 xl:sticky xl:top-5 xl:self-start">
          {task.assigneeType === "Agent" ? (
            <Panel tone="subtle" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="section-eyebrow">Agent run health</p>
                <span className={`rounded-full border px-3 py-1 text-xs ${agentHealth.accentClass}`}>{openClawState}</span>
              </div>
              <div className="mt-4">
                <TaskOpenClawDispatchButton taskId={task.id} currentStatus={task.status} />
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Latest signal</span>
                  <span className="text-xs text-[var(--text-dim)]">{openClawFreshness}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-muted)]">
                  {latestExecutionLine ?? "No execution signal yet."}
                </p>
              </div>
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <TaskStatusActions
                  taskId={task.id}
                  currentStatus={task.status}
                  blockedReason={task.blockedReason}
                  actorType="agent"
                  title="Agent controls"
                  options={task.transitionOptions ?? []}
                />
              </div>
            </Panel>
          ) : null}

          <Panel tone="subtle" className="p-4">
            <p className="section-eyebrow">Task facts</p>
            <div className="mt-4 space-y-4">
              <PropertyRow label="Owner" value={task.assignee} />
              <PropertyRow label="Reviewer" value={task.reviewer ?? "Unassigned"} />
              <PropertyRow label="Due" value={task.due} />
              <PropertyRow label="Priority" value={task.priority} />
            </div>
            {task.tags.length ? (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-xs text-[var(--text-strong)]">{tag}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          {(attachments.length || executionFeed.length || watchers.length || resolvedContext) ? (
            <Panel tone="subtle" className="p-4">
              <p className="section-eyebrow">Context and evidence</p>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {resolvedContext ? <p>Context inheritance is active for this task.</p> : null}
                {executionFeed.length ? <p>{executionFeed.length} execution log {executionFeed.length === 1 ? "entry" : "entries"} recorded.</p> : null}
                {attachments.length ? <p>{attachments.length} attachment{attachments.length === 1 ? "" : "s"} available.</p> : null}
                {watchers.length ? <p>{watchers.length} watcher{watchers.length === 1 ? "" : "s"} following updates.</p> : null}
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Panel>
  );
}
