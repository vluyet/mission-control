import Link from "next/link";
import type { AttachmentRecord, Comment, ContextBlock, TaskRecord, TimelineEvent, WatcherRecord } from "@/lib/demo-data";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { MessageIcon, PaperclipIcon } from "@/components/ui/icons";
import { Panel, PanelHeader, PriorityBadge, StatusBadge } from "@/components/ui/primitives";
import { TaskCommentsPanel } from "@/components/product/task-comments-panel";
import { TaskStatusActions } from "@/components/product/task-status-actions";
import { TaskConstructorDispatchCard } from "@/components/product/task-constructor-dispatch-card";
import { TaskAttachmentsPanel } from "@/components/product/task-attachments-panel";

function MetadataItem({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      {children ?? <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>}
    </div>
  );
}

function SidebarSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900 marker:content-none">
        <span>{title}</span>
        <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-slate-100 px-5 py-4">{children}</div>
    </details>
  );
}

function QuickActions({ task }: { task: TaskRecord }) {
  return (
    <div className="space-y-4">
      <TaskStatusActions
        taskId={task.id}
        currentStatus={task.status}
        blockedReason={task.blockedReason}
        actorType="human"
        title="Quick actions"
        hideHeader
        options={task.humanTransitionOptions ?? []}
      />
      <Link
        href={`/tasks/${task.id}/edit`}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Update task
      </Link>
    </div>
  );
}

function AgentDispatchBlock({ task }: { task: TaskRecord }) {
  return (
    <div>
      <TaskConstructorDispatchCard taskId={task.id} />
    </div>
  );
}

export function TaskWorkspace({
  task,
  comments,
  timeline,
  executionFeed,
  executionMeta,
  attachments = [],
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
  attachments?: AttachmentRecord[];
  childTasks?: Array<{ id: string; title: string; status: string }>;
  resolvedContext: {
    task: ResolvedTaskContext;
    workspace: ContextBlock;
    project?: ContextBlock;
  } | null;
  watchers?: WatcherRecord[];
  availableWatchers?: WatcherRecord[];
  compact?: boolean;
}) {
  return (
    <Panel className="border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1fr),360px]" : "xl:grid-cols-[minmax(0,1fr),360px]"}`}>
        <div className="p-6 xl:border-r xl:border-slate-200">
          <header className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {task.id}
                  </span>
                  <StatusBadge value={task.status} />
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{task.title}</h1>
              </div>
              <PriorityBadge value={task.priority} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetadataItem label="Assignee" value={task.assignee} />
              <MetadataItem label="Priority" value={task.priority} />
              <MetadataItem label="Due date" value={task.due} />
              <MetadataItem label="Labels">
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags.length ? task.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  )) : <span className="text-sm text-slate-500">No labels</span>}
                </div>
              </MetadataItem>
            </div>
          </header>

          <section className="mt-8">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Task description</h2>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-600">
                {task.description || "No task description yet."}
              </p>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <PanelHeader eyebrow="Discussion" title="Comments and activity" />
            <TaskCommentsPanel
              taskId={task.id}
              comments={comments}
              timeline={timeline}
              mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
            />
          </section>
        </div>

        <aside className="space-y-5 bg-slate-50/70 p-5">
          {task.assigneeType === "Agent" ? (
            <SidebarSection title="Agent run">
              <AgentDispatchBlock task={task} />
            </SidebarSection>
          ) : null}

          <SidebarSection title="Quick actions">
            <QuickActions task={task} />
          </SidebarSection>

          <SidebarSection title="Attachments" defaultOpen={false}>
            <TaskAttachmentsPanel
              taskId={task.id}
              attachments={attachments}
              agentActorName={task.assigneeType === "Agent" ? task.assignee : undefined}
              agentActorEnabled={task.assigneeType === "Agent" ? task.assigneeEnabled ?? false : false}
            />
          </SidebarSection>

          {(watchers.length || resolvedContext) ? (
            <SidebarSection title="Support" defaultOpen={false}>
              <div className="space-y-3">
                {watchers.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2">
                      <MessageIcon className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-900">Watchers</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{watchers.map((watcher) => watcher.name).join(", ")}</p>
                  </div>
                ) : null}
                {resolvedContext ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                    Context inheritance is enabled for this task.
                  </div>
                ) : null}
              </div>
            </SidebarSection>
          ) : null}
        </aside>
      </div>
    </Panel>
  );
}
