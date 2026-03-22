import Link from "next/link";
import { Comment, ContextBlock, TaskRecord, TimelineEvent } from "@/lib/demo-data";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
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

export function TaskWorkspace({
  task,
  comments,
  timeline: _timeline,
  executionFeed,
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
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1.2fr),360px]" : "xl:grid-cols-[minmax(0,1.35fr),360px]"}`}>
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

          <div className="mt-5">
            <Panel tone="subtle" className="overflow-hidden">
              <PanelHeader eyebrow="Discussion" title="Comments" />
              <TaskCommentsPanel
                taskId={task.id}
                comments={comments}
                mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
              />
            </Panel>
          </div>
        </div>

        <aside className="space-y-4 p-5">
          <Panel tone="subtle" className="p-4">
            <p className="section-eyebrow">Task summary</p>
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
          </Panel>

          <Panel tone="subtle" className="p-4">
            <TaskStatusActions
              taskId={task.id}
              currentStatus={task.status}
              blockedReason={task.blockedReason}
              actorType="human"
              title="Human workflow"
              options={task.humanTransitionOptions ?? []}
            />
          </Panel>

          {task.assigneeType === "Agent" ? (
            <>
              <Panel tone="subtle" className="p-4">
                <p className="section-eyebrow">OpenClaw</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Dispatch this task to the assigned OpenClaw agent. The run will use Mission Control's API contract for context, execution logs, comments, and status updates.
                </p>
                <div className="mt-4">
                  <TaskOpenClawDispatchButton taskId={task.id} />
                </div>
              </Panel>

              <Panel tone="subtle" className="p-4">
                <TaskStatusActions
                  taskId={task.id}
                  currentStatus={task.status}
                  blockedReason={task.blockedReason}
                  actorType="agent"
                  title="Agent workflow"
                  options={task.transitionOptions ?? []}
                />
              </Panel>
            </>
          ) : null}

          <Panel tone="subtle" className="p-4">
            <p className="section-eyebrow">Tags</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-strong)]">
                  {tag}
                </span>
              ))}
            </div>
          </Panel>

          {(attachments.length || watchers.length || executionFeed.length || resolvedContext) ? (
            <Panel tone="subtle" className="p-4">
              <p className="section-eyebrow">Advanced</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--text-muted)]">
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
