import Link from "next/link";
import type { ReactNode } from "react";
import { activityFeed, agentDocsSections, ContextBlock, Metric, ProjectSummary, TaskRecord } from "@/lib/demo-data";
import type { ActivityFeedItem } from "@/lib/demo-data";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import { BoardIcon, CalendarIcon, ChartIcon, FolderIcon, SearchIcon, SparkIcon, StackIcon } from "@/components/ui/icons";
import {
  AppButton,
  Panel,
  PanelHeader,
  PriorityBadge,
  StatusBadge
} from "@/components/ui/primitives";
import type { ResolvedTaskContext } from "@/lib/context-resolver";
import { AgentEnabledToggle } from "@/components/product/agent-enabled-toggle";
import { TaskStatusActions } from "@/components/product/task-status-actions";
import { TaskCommentsPanel } from "@/components/product/task-comments-panel";
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
import { SavedTaskViews } from "@/components/product/saved-task-views";
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
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="mt-1.5 text-[clamp(1.8rem,2.6vw,2.6rem)] font-semibold tracking-[-0.05em] text-[var(--text-strong)]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
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
          items.map((task) => {
            const health = getAgentRunHealth(task);
            return (
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
                  <p className="mt-2 text-xs text-[var(--text-dim)]">{health.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${health.accentClass}`}>{health.label}</span>
                  <PriorityBadge value={task.priority} />
                  <StatusBadge value={task.status} />
                </div>
              </Link>
            );
          })
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
                  {project.status}
                </span>
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
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-strong)]">{project.name}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{project.description}</p>
              </div>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                {project.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-dim)]">
              {project.lifecycle ? <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1">{project.lifecycle}</span> : null}
              {project.visibility ? <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1">{project.visibility}</span> : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Stat label="Open" value={String(project.open)} />
              <Stat label="Review" value={String(project.review)} />
              <Stat label="Blocked" value={String(project.blocked)} />
              <Stat label="Due" value={project.due} />
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
  description,
  projectScoped = false,
  emptyTitle = "No tasks yet",
  emptyDescription = "Create the first task to start tracking work."
}: {
  items: TaskRecord[];
  title?: string;
  description?: string;
  projectScoped?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Tasks" title={title} description={description} />
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
            {items.map((task) => {
              const health = task.assigneeType === "Agent" ? getAgentRunHealth(task) : null;
              return (
                <Link key={task.id} href={projectScoped ? `/projects/${task.projectSlug}/tasks/${task.id}` : `/tasks/${task.id}`} className="task-row">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1 font-mono text-[11px] text-[var(--text-dim)]">
                        {task.id}
                      </span>
                      <h3 className="truncate text-sm font-semibold text-[var(--text-strong)]">{task.title}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                      {!projectScoped ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          {task.project}
                        </span>
                      ) : null}
                      {task.parentTaskTitle ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          Subtask
                        </span>
                      ) : null}
                      {task.childCount ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          {task.childCount} subtasks
                        </span>
                      ) : null}
                      {task.tags.slice(0, 1).map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[11px] text-[var(--text-dim)]">
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 1 ? <span className="text-[11px] text-[var(--text-dim)]">+{task.tags.length - 1}</span> : null}
                      {health ? <span className={`rounded-full border px-2 py-1 text-[11px] ${health.accentClass}`}>{health.label}</span> : null}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={task.status} />
                    </div>
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
              );
            })}
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

function TaskViewControlLabel({
  label,
  icon
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="inline-flex h-8 items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function TaskViewControlChip({
  href,
  label,
  active = false,
  icon
}: {
  href: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition ${
        active
          ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
      }`}
    >
      {icon ? <span className="text-current">{icon}</span> : null}
      <span>{label}</span>
    </Link>
  );
}

export function TaskViewToolbar({
  basePath,
  current,
  tagOptions = [],
  includeTags = false,
  preservedParams = {},
  savedViewsKey
}: {
  basePath: string;
  current: { mode: "list" | "board"; status: string; timing: string; sort: string; tag: string };
  tagOptions?: string[];
  includeTags?: boolean;
  preservedParams?: Record<string, string>;
  savedViewsKey?: string;
}) {
  const activeFilters = [
    current.status ? `Status: ${statusLabel(current.status)}` : null,
    current.timing ? `Timing: ${timingLabel(current.timing)}` : null,
    current.tag ? `Tag: ${current.tag}` : null,
    current.sort !== "due" ? `Sort: ${sortLabel(current.sort)}` : null
  ].filter(Boolean) as string[];
  const clearHref = buildTaskViewHref(
    basePath,
    current,
    { status: "", timing: "", tag: "", sort: "due", mode: current.mode },
    preservedParams
  );
  const modeOptions = [
    { label: "List", value: "list" as const, icon: <StackIcon className="h-3.5 w-3.5" /> },
    { label: "Board", value: "board" as const, icon: <BoardIcon className="h-3.5 w-3.5" /> }
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
    <Panel className="overflow-hidden p-3">
      {activeFilters.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">Active</span>
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 text-xs font-medium text-[var(--text-strong)]"
            >
              {filter}
            </span>
          ))}
          <Link href={clearHref} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
            Clear filters
          </Link>
        </div>
      ) : null}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2 pr-1">
          <TaskViewControlLabel label="View" icon={<SparkIcon className="h-3.5 w-3.5" />} />
          {modeOptions.map((option) => (
            <TaskViewControlChip
              key={option.label}
              href={buildTaskViewHref(basePath, current, { mode: option.value }, preservedParams)}
              label={option.label}
              icon={option.icon}
              active={current.mode === option.value}
            />
          ))}
        </div>

        <div className="h-5 w-px shrink-0 bg-[var(--line)]" />

        <div className="flex items-center gap-2 pr-1">
          <TaskViewControlLabel label="Status" icon={<SearchIcon className="h-3.5 w-3.5" />} />
          {statusOptions.map((option) => (
            <TaskViewControlChip
              key={option.label}
              href={buildTaskViewHref(basePath, current, { status: option.value }, preservedParams)}
              label={option.label}
              active={current.status === option.value}
            />
          ))}
        </div>

        <div className="h-5 w-px shrink-0 bg-[var(--line)]" />

        <div className="flex items-center gap-2 pr-1">
          <TaskViewControlLabel label="Timing" icon={<CalendarIcon className="h-3.5 w-3.5" />} />
          {timingOptions.map((option) => (
            <TaskViewControlChip
              key={option.label}
              href={buildTaskViewHref(basePath, current, { timing: option.value }, preservedParams)}
              label={option.label}
              active={current.timing === option.value}
            />
          ))}
        </div>

        {includeTags && tagOptions.length ? (
          <>
            <div className="h-5 w-px shrink-0 bg-[var(--line)]" />
            <div className="flex items-center gap-2 pr-1">
              <TaskViewControlLabel label="Tags" icon={<FolderIcon className="h-3.5 w-3.5" />} />
              <TaskViewControlChip
                href={buildTaskViewHref(basePath, current, { tag: "" }, preservedParams)}
                label="All tags"
                active={!current.tag}
              />
            {tagOptions.map((tag) => (
              <TaskViewControlChip
                key={tag}
                href={buildTaskViewHref(basePath, current, { tag }, preservedParams)}
                label={tag}
                active={current.tag === tag}
              />
            ))}
            </div>
          </>
        ) : null}

        <div className="h-5 w-px shrink-0 bg-[var(--line)]" />

        <div className="flex items-center gap-2">
          <TaskViewControlLabel label="Sort" icon={<ChartIcon className="h-3.5 w-3.5" />} />
          {sortOptions.map((option) => (
            <TaskViewControlChip
              key={option.label}
              href={buildTaskViewHref(basePath, current, { sort: option.value }, preservedParams)}
              label={option.label}
              active={current.sort === option.value}
            />
          ))}
        </div>

        {savedViewsKey ? (
          <>
            <div className="h-5 w-px shrink-0 bg-[var(--line)]" />
            <SavedTaskViews
              storageKey={savedViewsKey}
              basePath={basePath}
              current={current}
              preservedParams={preservedParams}
              compact
            />
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    "": "All statuses",
    todo: "Todo",
    "in-progress": "In progress",
    "in-review": "In review",
    blocked: "Blocked"
  };

  return labels[value] ?? value;
}

function timingLabel(value: string) {
  const labels: Record<string, string> = {
    "": "All timing",
    "due-soon": "Due soon",
    overdue: "Overdue"
  };

  return labels[value] ?? value;
}

function sortLabel(value: string) {
  const labels: Record<string, string> = {
    due: "Due date",
    priority: "Priority",
    updated: "Updated",
    created: "Created"
  };

  return labels[value] ?? value;
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
