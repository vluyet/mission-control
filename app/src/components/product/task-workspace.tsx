import Link from "next/link";
import { AttachmentRecord, Comment, ContextBlock, TaskRecord, TimelineEvent } from "@/lib/demo-data";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  MessageIcon,
  PaperclipIcon,
  PulseIcon,
  SparkIcon,
  StackIcon
} from "@/components/ui/icons";
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

function InsightCard({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="task-hero-stat glass-card glow-card">
      <div className="task-hero-stat-icon">{icon}</div>
      <div>
        <p className="task-hero-stat-label">{label}</p>
        <p className="task-hero-stat-value">{value}</p>
        <p className="task-hero-stat-hint">{hint}</p>
      </div>
    </div>
  );
}

function TerminalLine({
  index,
  line,
  tone = "neutral"
}: {
  index: number;
  line: string;
  tone?: "neutral" | "success" | "warn" | "danger" | "info";
}) {
  return (
    <div className={`terminal-line terminal-line-${tone}`}>
      <span className="terminal-line-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="terminal-line-prompt">›</span>
      <span className="terminal-line-text">{line}</span>
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

function classifyExecutionLine(line: string): "neutral" | "success" | "warn" | "danger" | "info" {
  const normalized = line.toLowerCase();

  if (normalized.includes("blocked") || normalized.includes("error") || normalized.includes("failed")) {
    return "danger";
  }

  if (normalized.includes("finished") || normalized.includes("review") || normalized.includes("done")) {
    return "success";
  }

  if (normalized.includes("waiting") || normalized.includes("pending") || normalized.includes("todo")) {
    return "warn";
  }

  if (normalized.includes("dispatch") || normalized.includes("context") || normalized.includes("telemetry")) {
    return "info";
  }

  return "neutral";
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
    <Panel tone="subtle" className="mt-6 p-5 glass-card glow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Review checkpoint</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{checkpointTitle}</h3>
        </div>
        <StatusBadge value={task.status} />
      </div>

      <div className="mt-4 rounded-[28px] border border-[var(--line)] bg-white/84 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Recommended action</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{recommendedNextStep}</p>
        {latestExecutionAt ? <p className="mt-3 text-xs text-[var(--text-dim)]">Last agent update: {latestExecutionAt}</p> : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <div className="rounded-[28px] border border-[var(--line)] bg-white/84 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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
        <div className="rounded-[28px] border border-[var(--line)] bg-white/84 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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
  const timelineSummary = [
    `${timeline.length} timeline ${timeline.length === 1 ? "event" : "events"}`,
    `${comments.length} comment${comments.length === 1 ? "" : "s"}`,
    `${executionFeed.length} execution signal${executionFeed.length === 1 ? "" : "s"}`
  ];
  const terminalLines = executionFeed.slice(-8);

  return (
    <Panel className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.92))] shadow-[0_24px_120px_rgba(15,23,42,0.08)]">
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
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1.12fr),420px]" : "xl:grid-cols-[minmax(0,1.08fr),420px]"}`}>
        <div className="border-b border-[var(--line)] p-5 xl:border-b-0 xl:border-r">
          <section className="task-hero-shell glass-card aurora-panel overflow-hidden rounded-[32px] border border-white/60 px-6 py-6">
            <div className="task-hero-backdrop" />
            <div className="task-hero-content">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="task-pill">{task.id}</span>
                    <span className="task-pill">{task.assigneeType}</span>
                    {task.project ? <span className="task-pill">{task.project}</span> : null}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-strong)] sm:text-[2.1rem]">{task.title}</h2>
                  <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--text-muted)]">
                    {task.description || "No task brief yet. Add a concise goal so the assigned human or agent knows exactly what success looks like."}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={task.status} />
                    <PriorityBadge value={task.priority} />
                  </div>
                  {taskSignals.length ? (
                    <div className="flex max-w-sm flex-wrap justify-end gap-2">
                      {taskSignals.map((signal) => (
                        <span key={signal} className="task-chip-soft">
                          {signal}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InsightCard label="Owner" value={task.assignee} hint={`Reviewer: ${task.reviewer ?? "Unassigned"}`} icon={<SparkIcon className="h-4 w-4" />} />
                <InsightCard label="Agent state" value={openClawState} hint={openClawFreshness} icon={<PulseIcon className="h-4 w-4" />} />
                <InsightCard label="Due date" value={task.due} hint={`Priority ${task.priority}`} icon={<CalendarIcon className="h-4 w-4" />} />
                <InsightCard label="Signals" value={timelineSummary[2]} hint={timelineSummary.slice(0, 2).join(" · ")} icon={<ActivityIcon className="h-4 w-4" />} />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr),minmax(280px,0.85fr)]">
            <div className="rounded-[32px] border border-[var(--line)] bg-white/82 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Task control center</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{decisionGuidance.title}</h3>
                </div>
                <ArrowUpRightIcon className="h-5 w-5 text-[var(--accent-strong)]" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{decisionGuidance.detail}</p>
              {task.blockedReason ? (
                <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
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
            </div>

            <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))] p-5 text-white shadow-[0_24px_100px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow text-white/60">Execution terminal</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Human review console</h3>
                </div>
                <div className="terminal-ledger">
                  <span className="terminal-led terminal-led-red" />
                  <span className="terminal-led terminal-led-amber" />
                  <span className="terminal-led terminal-led-green" />
                </div>
              </div>
              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="terminal-meta-row">
                  <span>state={task.status.toLowerCase().replace(/\s+/g, "_")}</span>
                  <span>assignee={task.assigneeType.toLowerCase()}</span>
                  <span>watchers={watchers.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {terminalLines.length ? (
                    terminalLines.map((line, index) => (
                      <TerminalLine key={`${index}-${line}`} index={index} line={line} tone={classifyExecutionLine(line)} />
                    ))
                  ) : (
                    <TerminalLine index={0} line="No execution signal yet. Dispatch or wait for the next update." tone="warn" />
                  )}
                </div>
              </div>
            </div>
          </section>

          {task.parentTaskTitle || childTasks.length ? (
            <section className="mt-6 rounded-[32px] border border-[var(--line)] bg-white/82 px-6 py-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Task structure</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">Task hierarchy</h3>
                </div>
                <StackIcon className="h-5 w-5 text-[var(--accent-strong)]" />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Parent</p>
                  {task.parentTaskTitle ? (
                    <Link href={`/tasks/${task.parentTaskId}`} className="mt-3 inline-flex rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-strong)] transition hover:border-[var(--line-strong)]">
                      {task.parentTaskTitle}
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">No parent task.</p>
                  )}
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Subtasks</p>
                  {childTasks.length ? (
                    <div className="mt-3 space-y-2">
                      {childTasks.map((child) => (
                        <Link key={child.id} href={`/tasks/${child.id}`} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm transition hover:border-[var(--line-strong)]">
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

          <section className="mt-6 overflow-hidden rounded-[32px] border border-[var(--line)] bg-white/88 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <PanelHeader eyebrow="Task communication" title="Timeline, updates, and collaboration" />
            <TaskCommentsPanel
              taskId={task.id}
              comments={comments}
              timeline={timeline}
              mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
            />
          </section>
        </div>

        <aside className="space-y-5 p-5 xl:sticky xl:top-5 xl:self-start">
          {task.assigneeType === "Agent" ? (
            <Panel tone="subtle" className="agent-sidebar-panel glass-card aurora-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Agent process</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">Actionable run controls</h3>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${agentHealth.accentClass}`}>{openClawState}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="agent-process-card">
                  <p className="agent-process-label">Latest signal</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-strong)]">{latestExecutionLine ?? "No execution signal yet."}</p>
                  <p className="mt-3 text-xs text-[var(--text-dim)]">{openClawFreshness}</p>
                </div>
                <div className="agent-process-card">
                  <p className="agent-process-label">Human reviewer should know</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                    <li>• Confirm the brief is complete before re-dispatching.</li>
                    <li>• Use blockers when the agent needs human input.</li>
                    <li>• Keep the timeline focused on observable progress.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4">
                <TaskOpenClawDispatchButton taskId={task.id} currentStatus={task.status} />
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

          <Panel tone="subtle" className="glass-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Task facts</p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">Briefing snapshot</h3>
              </div>
              <MessageIcon className="h-5 w-5 text-[var(--accent-strong)]" />
            </div>
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
            <Panel tone="subtle" className="glass-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Context and evidence</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">Reviewer-ready inputs</h3>
                </div>
                <PaperclipIcon className="h-5 w-5 text-[var(--accent-strong)]" />
              </div>
              <div className="mt-4 grid gap-3">
                {resolvedContext ? <div className="agent-process-card">Context inheritance is active for this task.</div> : null}
                {executionFeed.length ? <div className="agent-process-card">{executionFeed.length} execution log {executionFeed.length === 1 ? "entry" : "entries"} recorded.</div> : null}
                {attachments.length ? <div className="agent-process-card">{attachments.length} attachment{attachments.length === 1 ? "" : "s"} available for review.</div> : null}
                {watchers.length ? <div className="agent-process-card">{watchers.length} watcher{watchers.length === 1 ? "" : "s"} following updates.</div> : null}
              </div>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Panel>
  );
}
