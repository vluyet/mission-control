import Link from "next/link";
import type { ReactNode } from "react";
import { activityFeed, agentDocsSections, ContextBlock, Metric, ProjectSummary, TaskRecord } from "@/lib/demo-data";
import type { ActivityFeedItem } from "@/lib/demo-data";
import { SparkIcon } from "@/components/ui/icons";
import {
  AppButton,
  FilterChip,
  Panel,
  PanelHeader,
  PriorityBadge,
  StatusBadge
} from "@/components/ui/primitives";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { AgentEnabledToggle } from "@/components/product/agent-enabled-toggle";
import { TaskStatusActions } from "@/components/product/task-status-actions";
import { TaskOpenClawDispatchButton } from "@/components/product/task-openclaw-dispatch-button";
import { TaskCommentsPanel } from "@/components/product/task-comments-panel";
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
export { TaskWorkspace } from "@/components/product/task-workspace";
export { MemberDirectory } from "@/components/product/member-directory";

type BoardColumn = {
  title: TaskRecord["status"];
  count: number;
  accent: "slate" | "blue" | "gold" | "red" | "emerald";
  cards: Array<{
    id: string;
    title: string;
    assignee: string;
    priority: TaskRecord["priority"];
    eta: string;
    effort: TaskRecord["effort"];
    project: string;
    tags?: string[];
    childCount?: number;
    parentTaskTitle?: string | null;
  }>;
};

export function ContextPanel({
  title,
  blocks,
  compact = false
}: {
  title: string;
  blocks: Array<ContextBlock | undefined>;
  compact?: boolean;
}) {
  const filtered = blocks.filter(Boolean) as ContextBlock[];

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Context" title={title} />
      <div className={`grid gap-3 px-5 py-4 ${compact ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
        {filtered.map((block) => (
          <div key={block.title + block.summary} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{block.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{block.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              {block.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-[0.5rem] inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-[clamp(1.9rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-[var(--text-strong)]">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricStrip({ items }: { items: Metric[] }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {items.map((metric) => (
        <Panel key={metric.label} className="p-4">
          <div
            className={`h-1.5 w-12 rounded-full ${
              metric.tone === "accent"
                ? "bg-[var(--accent-strong)]"
                : metric.tone === "warning"
                  ? "bg-amber-500"
                  : metric.tone === "success"
                    ? "bg-emerald-500"
                    : "bg-slate-300"
            }`}
          />
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">{metric.label}</p>
          <p className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--text-strong)]">{metric.value}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{metric.detail}</p>
        </Panel>
      ))}
    </div>
  );
}

export function FocusQueuePanel({
  items,
  title = "Needs attention"
}: {
  items: TaskRecord[];
  title?: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Focus" title={title} action={<AppButton tone="secondary" href="/my-tasks">Open tasks</AppButton>} />
      <div className="divide-y divide-[var(--line)]">
        {items.length ? (
          items.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="dashboard-list-row">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--text-dim)]">
                    {task.id}
                  </span>
                  <h3 className="truncate text-sm font-semibold text-[var(--text-strong)]">{task.title}</h3>
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {task.project} · {task.assignee} · {task.due}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PriorityBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </Link>
          ))
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">Nothing needs attention yet.</div>
        )}
      </div>
    </Panel>
  );
}

export function ProjectSnapshotPanel({
  items,
  title = "Active projects"
}: {
  items: ProjectSummary[];
  title?: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Projects" title={title} action={<AppButton tone="secondary" href="/projects">All projects</AppButton>} />
      <div className="divide-y divide-[var(--line)]">
        {items.length ? (
          items.map((project) => (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="dashboard-list-row">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-strong)]">{project.name}</h3>
                <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{project.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">
                  Open {project.open} · Review {project.review} · Blocked {project.blocked}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                  {project.completionRate}
                </span>
                <StatusBadge value={project.status === "On track" ? "Done" : project.status === "Needs review" ? "In Review" : "Blocked"} />
              </div>
            </Link>
          ))
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">No projects yet.</div>
        )}
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">{value}</p>
    </div>
  );
}

export function ProjectGrid({ items }: { items: ProjectSummary[] }) {
  return (
    <div className="grid gap-3 2xl:grid-cols-2">
      {items.map((project) => (
        <Link key={project.slug} href={`/projects/${project.slug}`}>
          <Panel className="project-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Project</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-strong)]">{project.name}</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-muted)]">{project.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.lifecycle ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
                      {project.lifecycle}
                    </span>
                  ) : null}
                  {project.visibility ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
                      {project.visibility}
                    </span>
                  ) : null}
                </div>
              </div>
              <StatusBadge value={project.status === "On track" ? "Done" : project.status === "Needs review" ? "In Review" : "Blocked"} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              <Stat label="Open" value={String(project.open)} />
              <Stat label="Review" value={String(project.review)} />
              <Stat label="Blocked" value={String(project.blocked)} />
              <Stat label="Done" value={String(project.completed)} />
              <Stat label="Due" value={project.due} />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-sm">
              <span className="text-[var(--text-muted)]">Completion progress</span>
              <span className="font-semibold text-[var(--text-strong)]">{project.completionRate}</span>
            </div>
          </Panel>
        </Link>
      ))}
    </div>
  );
}

export function TaskTable({
  items,
  title = "Task list",
  projectScoped = false,
  emptyTitle = "No tasks yet",
  emptyDescription = "Create the first task to start tracking work."
}: {
  items: TaskRecord[];
  title?: string;
  projectScoped?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Tasks" title={title} />
      {items.length ? (
        <>
          <div className="task-table-header">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Owner</span>
            <span>Due</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.map((task) => (
              <Link key={task.id} href={projectScoped ? `/projects/${task.projectSlug}/tasks/${task.id}` : `/tasks/${task.id}`} className="task-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--text-dim)]">
                      {task.id}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-[var(--text-strong)]">{task.title}</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span>{task.project}</span>
                    {task.parentTaskTitle ? (
                      <>
                        <span className="text-[var(--line-strong)]">•</span>
                        <span>Subtask of {task.parentTaskTitle}</span>
                      </>
                    ) : null}
                    {task.childCount ? (
                      <>
                        <span className="text-[var(--line-strong)]">•</span>
                        <span>{task.childCount} subtasks</span>
                      </>
                    ) : null}
                    {task.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs text-[var(--text-dim)]">
                        {tag}
                      </span>
                    ))}
                    {task.tags.length > 2 ? (
                      <span className="text-xs text-[var(--text-dim)]">+{task.tags.length - 2}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-start">
                  <StatusBadge value={task.status} />
                </div>
                <div className="flex justify-start">
                  <PriorityBadge value={task.priority} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`avatar-chip ${task.assigneeType === "Agent" ? "avatar-chip-agent" : ""}`}>
                    {task.assignee.slice(0, 2)}
                  </span>
                  <div className="min-w-0 text-left text-sm font-medium text-[var(--text-strong)]">
                    <span className="block truncate">{task.assignee}</span>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-[var(--text-strong)]">{task.due}</div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="px-5 py-8">
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{emptyTitle}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{emptyDescription}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function buildTaskViewHref(
  basePath: string,
  current: { mode: "list" | "board"; status: string; timing: string; sort: string; tag: string },
  updates: Partial<{ mode: "list" | "board"; status: string; timing: string; sort: string; tag: string }>,
  preserved: Record<string, string> = {}
) {
  const [pathname, existingQuery] = basePath.split("?");
  const params = new URLSearchParams(existingQuery || "");
  const next = { ...current, ...updates };

  for (const [key, value] of Object.entries(preserved)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(next)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function TaskViewToolbar({
  basePath,
  current,
  tagOptions = [],
  includeTags = false,
  preservedParams = {}
}: {
  basePath: string;
  current: { mode: "list" | "board"; status: string; timing: string; sort: string; tag: string };
  tagOptions?: string[];
  includeTags?: boolean;
  preservedParams?: Record<string, string>;
}) {
  const modeOptions = [
    { label: "List", value: "list" as const },
    { label: "Board", value: "board" as const }
  ];
  const statusOptions = [
    { label: "All statuses", value: "" },
    { label: "Todo", value: "todo" },
    { label: "In progress", value: "in-progress" },
    { label: "In review", value: "in-review" },
    { label: "Blocked", value: "blocked" }
  ];
  const timingOptions = [
    { label: "All timing", value: "" },
    { label: "Due soon", value: "due-soon" },
    { label: "Overdue", value: "overdue" }
  ];
  const sortOptions = [
    { label: "Due date", value: "due" },
    { label: "Priority", value: "priority" },
    { label: "Updated", value: "updated" },
    { label: "Created", value: "created" }
  ];

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="section-eyebrow mr-2">Layout</p>
          {modeOptions.map((option) => (
            <Link key={option.label} href={buildTaskViewHref(basePath, current, { mode: option.value }, preservedParams)} className="inline-flex">
              <FilterChip label={option.label} active={current.mode === option.value} />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="section-eyebrow mr-2">Filter</p>
          {statusOptions.map((option) => (
            <Link
              key={option.label}
              href={buildTaskViewHref(basePath, current, { status: option.value }, preservedParams)}
              className="inline-flex"
            >
              <FilterChip label={option.label} active={current.status === option.value} />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="section-eyebrow mr-2">Timing</p>
          {timingOptions.map((option) => (
            <Link
              key={option.label}
              href={buildTaskViewHref(basePath, current, { timing: option.value }, preservedParams)}
              className="inline-flex"
            >
              <FilterChip label={option.label} active={current.timing === option.value} />
            </Link>
          ))}
        </div>

        {includeTags && tagOptions.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="section-eyebrow mr-2">Tags</p>
            <Link href={buildTaskViewHref(basePath, current, { tag: "" }, preservedParams)} className="inline-flex">
              <FilterChip label="All tags" active={!current.tag} />
            </Link>
            {tagOptions.map((tag) => (
              <Link key={tag} href={buildTaskViewHref(basePath, current, { tag }, preservedParams)} className="inline-flex">
                <FilterChip label={tag} active={current.tag === tag} />
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <p className="section-eyebrow mr-2">Sort</p>
          {sortOptions.map((option) => (
            <Link
              key={option.label}
              href={buildTaskViewHref(basePath, current, { sort: option.value }, preservedParams)}
              className="inline-flex"
            >
              <FilterChip label={option.label} active={current.sort === option.value} />
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function BoardGrid({
  columns,
  title = "Kanban board"
}: {
  columns: BoardColumn[];
  title?: string;
}) {
  return <BoardGridInteractive columns={columns} title={title} />;
}


export function ActivityPanel({ items = activityFeed }: { items?: ActivityFeedItem[] }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Activity"
        title="Recent changes"
        action={undefined}
      />
      <div className="space-y-3 px-5 py-4">
        {items.length ? (
          items.map((item, index) => (
            <div key={item.id ?? `${item.label}-${item.time}-${index}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{item.detail}</p>
                </div>
                <span className="text-xs text-[var(--text-dim)]">{item.time}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--text-dim)]">
            No activity yet.
          </div>
        )}
      </div>
    </Panel>
  );
}

export function AgentDocsOverview() {
  return <ContextPanel title="Agent integration contract" blocks={agentDocsSections} compact />;
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-dim)]">
          <SparkIcon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-[var(--text-strong)]">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </Panel>
  );
}
