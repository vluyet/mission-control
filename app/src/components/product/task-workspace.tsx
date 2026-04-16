"use client";

import Link from "next/link";
import type { AttachmentRecord, Comment, ContextBlock, TaskRecord, TimelineEvent, WatcherRecord } from "@/lib/demo-data";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { MessageIcon } from "@/components/ui/icons";
import { Panel, PanelHeader, PriorityBadge, StatusBadge } from "@/components/ui/primitives";
import { TaskCommentsPanel } from "@/components/product/task-comments-panel";
import { TaskStatusActions } from "@/components/product/task-status-actions";
import { TaskConstructorDispatchCard } from "@/components/product/task-constructor-dispatch-card";
import { TaskAttachmentsPanel } from "@/components/product/task-attachments-panel";
import { useI18n } from "@/components/product/i18n-provider";

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
  const { t } = useI18n();
  const rawAssigneeType = task.rawAssigneeType ?? task.assigneeType;
  const isAgentTask = rawAssigneeType === "Agent";

  return (
    <div className="space-y-4">
      <TaskStatusActions
        taskId={task.id}
        currentStatus={task.status}
        rawStatus={task.rawStatus ?? task.status}
        blockedReason={task.blockedReason}
        actorType="human"
        title={t("taskWorkspace.quickActions")}
        hideHeader
        options={task.humanTransitionOptions ?? []}
      />
      <Link
        href={`/tasks/${task.id}/edit`}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        {t("taskWorkspace.updateTask")}
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
  const { t } = useI18n();
  const rawAssigneeType = task.rawAssigneeType ?? task.assigneeType;
  const isAgentTask = rawAssigneeType === "Agent";

  return (
    <Panel className="border border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.05)]" data-testid="task-workspace-root">
      <div className={`grid gap-0 ${compact ? "2xl:grid-cols-[minmax(0,1fr),360px]" : "xl:grid-cols-[minmax(0,1fr),360px]"}`}>
        <div className="p-6 xl:border-r xl:border-slate-200">
          <header className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span data-testid="task-workspace-id" className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {task.id}
                  </span>
                  <StatusBadge value={task.status} />
                </div>
                <h1 data-testid="task-workspace-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{task.title}</h1>
              </div>
              <PriorityBadge value={task.priority} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetadataItem label={t("taskWorkspace.assignee")} value={task.assignee} />
              <MetadataItem label={t("common.priority")} value={task.priority} />
              <MetadataItem label={t("taskWorkspace.dueDate")} value={task.due} />
              <MetadataItem label={t("taskWorkspace.labels")}>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags.length ? task.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  )) : <span className="text-sm text-slate-500">{t("taskWorkspace.noLabels")}</span>}
                </div>
              </MetadataItem>
            </div>
          </header>

          <section className="mt-8">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t("taskWorkspace.taskDescription")}</h2>
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-600">
                {task.description || t("taskWorkspace.noTaskDescriptionYet")}
              </p>
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
            <PanelHeader eyebrow={t("taskWorkspace.discussion")} title={t("taskWorkspace.commentsAndActivity")} />
            <TaskCommentsPanel
              taskId={task.id}
              comments={comments}
              timeline={timeline}
              mentionSuggestions={availableWatchers.map((watcher) => watcher.name)}
            />
          </section>
        </div>

        <aside className="space-y-5 bg-slate-50/70 p-5">
          {isAgentTask ? (
            <SidebarSection title={t("taskWorkspace.agentRun")}>
              <AgentDispatchBlock task={task} />
            </SidebarSection>
          ) : null}

          <SidebarSection title={t("taskWorkspace.quickActions")}>
            <QuickActions task={task} />
          </SidebarSection>

          <SidebarSection title={t("taskWorkspace.attachments")} defaultOpen={false}>
            <TaskAttachmentsPanel
              taskId={task.id}
              attachments={attachments}
              agentActorName={isAgentTask ? task.assignee : undefined}
              agentActorEnabled={isAgentTask ? task.assigneeEnabled ?? false : false}
            />
          </SidebarSection>

          {(watchers.length || resolvedContext) ? (
            <SidebarSection title={t("taskWorkspace.support")} defaultOpen={false}>
              <div className="space-y-3">
                {watchers.length ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2">
                      <MessageIcon className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-900">{t("taskWorkspace.watchers")}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{watchers.map((watcher) => watcher.name).join(", ")}</p>
                  </div>
                ) : null}
                {resolvedContext ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                    {t("taskWorkspace.contextInheritanceEnabled")}
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
