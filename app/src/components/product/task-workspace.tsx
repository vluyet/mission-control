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

  const latestHumanOrAgentComment = [...comments].reverse().find((comment) => comment.tone === "agent" || comment.role !== "System");
  const latestUpdate = executionFeed[executionFeed.length - 1] ?? latestHumanOrAgentComment?.body ?? "No completion summary was recorded yet.";
  const evidence = [
    executionFeed.length ? `${executionFeed.length} execution ${executionFeed.length === 1 ? "update" : "updates"}` : null,
    comments.length ? `${comments.length} conversation ${comments.length === 1 ? "entry" : "entries"}` : null,
    attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : null
  ].filter(Boolean);
  const recommendedNextStep =
    task.status === "In Review"
      ? "Review the outcome, then approve it or request another pass with a short note."
      : task.status === "Blocked"
        ? "Resolve the blocker or add the missing context before sending the task back into progress."
        : "Use this summary to verify the outcome quickly before deciding whether anything still needs follow-up.";

  return (
    <Panel tone="subtle" className="mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Review summary</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
            {task.status === "Blocked"
              ? "Blocked and waiting on human input"
              : task.status === "In Review"
                ? "Ready for a human decision"
                : "Completed with review context"}
          </h3>
        </div>
        <StatusBadge value={task.status} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Outcome</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{latestUpdate}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Recommended next step</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{recommendedNextStep}</p>
          {latestExecutionAt ? <p className="mt-3 text-xs text-[var(--text-dim)]">Latest agent signal recorded at {latestExecutionAt}.</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Evidence available</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {evidence.length ? evidence.map((item) => (
              <span key={item} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-strong)]">{item}</span>
            )) : <span className="text-sm text-[var(--text-muted)]">No structured evidence yet.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Risks and caveats</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {task.blockedReason ?? "Review the final output against the task goal before marking it done. If anything is unclear, request changes with a short correction note."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export function TaskWorkspace({
  task,
  comments,
  timeline: _timeline,
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
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Task detail"
        title={task.title}
        description={task.description}
        action={
          <div className="flex flex-wrap gap-2">
            <AppButton tone="primary" href={`/tasks/${task.id}/edit`}>
              Update task
            </AppButton>
          </div>
        }
      />
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1.28fr),320px]" : "xl:grid-cols-[minmax(0,1.5fr),320px]"}`}>
        <div className="border-b border-[var(--line)] p-5 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={task.status} />
            <PriorityBadge value={task.priority} />
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--text-dim)]">
              {task.project}
            </span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--text-dim)]">
              Effort {task.effort}
            </span>
          </div>

          {task.parentTaskTitle || childTasks.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Panel tone="subtle" className="p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Task structure</h3>
                {task.parentTaskTitle ? (
                  <Link href={`/tasks/${task.parentTaskId}`} className="mt-3 inline-flex rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">
                    Parent: {task.parentTaskTitle}
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">This task is currently a top-level task.</p>
                )}
              </Panel>
              <Panel tone="subtle" className="p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Subtasks</h3>
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
                  <p className="mt-3 text-sm text-[var(--text-muted)]">No subtasks yet for this task.</p>
                )}
              </Panel>
            </div>
          ) : null}

          <TaskReviewSummary
            task={task}
            comments={comments}
            executionFeed={executionFeed}
            attachments={attachments}
            latestExecutionAt={executionMeta?.latestUpdatedAt}
          />

          <div className="mt-5">
            <Panel tone="subtle" className="overflow-hidden">
              <PanelHeader eyebrow="Discussion" title="Team conversation" />
              <TaskCommentsPanel
                taskId={task.id}
                comments={comments}
                mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
              />
            </Panel>
          </div>
        </div>

        <aside className="space-y-4 p-5 xl:sticky xl:top-5 xl:self-start">
          <Panel tone="subtle" className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="section-eyebrow">Summary</p>
              <StatusBadge value={task.status} />
            </div>
            <div className="mt-4 space-y-4">
              <PropertyRow label="Owner" value={task.assignee} />
              <PropertyRow label="Type" value={task.assigneeType} />
              <PropertyRow label="Reviewer" value={task.reviewer ?? "Unassigned"} />
              <PropertyRow label="Due" value={task.due} />
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
                title="What you can do next"
                options={task.humanTransitionOptions ?? []}
              />
            </div>
          </Panel>

          {task.assigneeType === "Agent" ? (
            <>
              <Panel tone="subtle" className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="section-eyebrow">Agent run</p>
                  <span className={`rounded-full border px-3 py-1 text-xs ${agentHealth.accentClass}`}>{openClawState}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Dispatch work to the assigned OpenClaw agent and follow the latest progress here.
                </p>
                <div className="mt-4">
                  <TaskOpenClawDispatchButton taskId={task.id} currentStatus={task.status} />
                </div>
                <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-strong)]">Latest meaningful update</span>
                    <span className="text-xs text-[var(--text-dim)]">{openClawFreshness}</span>
                  </div>
                  <p className="mt-2 text-[var(--text-muted)]">
                    {executionFeed[executionFeed.length - 1] ?? "No execution updates yet. Once dispatched, progress entries will appear here."}
                  </p>
                </div>
                {executionFeed.length ? (
                  <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Recent updates</p>
                    <div className="mt-3 space-y-2">
                      {executionFeed.slice(-3).reverse().map((line, index) => (
                        <div key={`${index}-${line}`} className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--text-muted)]">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-5 border-t border-[var(--line)] pt-4">
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
            </>
          ) : null}

          {(task.tags.length || attachments.length || watchers.length || executionFeed.length || resolvedContext) ? (
            <Panel tone="subtle" className="p-4">
              <p className="section-eyebrow">Details</p>
              {task.tags.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-strong)]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                {resolvedContext ? <p>Context inheritance is available for agent execution.</p> : null}
                {executionFeed.length ? <p>{executionFeed.length} execution log {executionFeed.length === 1 ? "entry" : "entries"} recorded.</p> : null}
                {attachments.length ? <p>{attachments.length} attachment{attachments.length === 1 ? "" : "s"} available.</p> : null}
                {watchers.length ? <p>{watchers.length} watcher{watchers.length === 1 ? "" : "s"} following this task.</p> : null}
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Panel>
  );
}
