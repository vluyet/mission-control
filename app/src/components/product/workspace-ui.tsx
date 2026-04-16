"use client";

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
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
import { SavedTaskViews } from "@/components/product/saved-task-views";
import { useI18n } from "@/components/product/i18n-provider";
export { TaskWorkspace } from "@/components/product/task-workspace";
export { MemberDirectory } from "@/components/product/member-directory";

type BoardColumn = {
  title: string;
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
  const { t } = useI18n();

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={t("workspaceUi.context")} title={title} />
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
  title
}: {
  items: TaskRecord[];
  title?: string;
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("workspaceUi.needsAttention");

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={t("workspaceUi.focus")} title={resolvedTitle} action={<AppButton tone="secondary" href="/my-tasks">{t("workspaceUi.openTasks")}</AppButton>} />
      <div className="divide-y divide-[var(--line)]">
        {items.length ? (
          items.map((task) => {
            const health = getAgentRunHealth(task, undefined, t);
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
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">{t("workspaceUi.nothingNeedsAttentionYet")}</div>
        )}
      </div>
    </Panel>
  );
}

export function ProjectSnapshotPanel({
  items,
  title
}: {
  items: ProjectSummary[];
  title?: string;
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("workspaceUi.activeProjects");

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={t("workspaceUi.projectsEyebrow")} title={resolvedTitle} action={<AppButton tone="secondary" href="/projects">{t("workspaceUi.allProjects")}</AppButton>} />
      <div className="divide-y divide-[var(--line)]">
        {items.length ? (
          items.map((project) => (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="dashboard-list-row">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-strong)]">{project.name}</h3>
                <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{project.description}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-dim)]">
                  {t("common.open")} {project.open} · {t("common.review")} {project.review} · {t("common.blocked")} {project.blocked}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                  {getProjectStatusLabel(project.status, t)}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">{t("workspaceUi.noProjectsYet")}</div>
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

const PROJECT_STATUS_CONFIG: Record<ProjectSummary["status"], { labelKey: string; toneClass: string }> = {
  on_track: {
    labelKey: "workspaceUi.onTrack",
    toneClass: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  needs_review: {
    labelKey: "workspaceUi.needsReview",
    toneClass: "border-amber-200 bg-amber-50 text-amber-700"
  },
  at_risk: {
    labelKey: "workspaceUi.atRisk",
    toneClass: "border-rose-200 bg-rose-50 text-rose-700"
  }
};

function getProjectStatusConfig(value: ProjectSummary["status"] | string | null | undefined) {
  if (value && value in PROJECT_STATUS_CONFIG) {
    return PROJECT_STATUS_CONFIG[value as ProjectSummary["status"]];
  }

  return PROJECT_STATUS_CONFIG.on_track;
}

function getProjectStatusLabel(value: ProjectSummary["status"] | string | null | undefined, t: (key: string) => string) {
  return t(getProjectStatusConfig(value).labelKey);
}

function ProjectStatusBadge({ value }: { value: ProjectSummary["status"] | string | null | undefined }) {
  const { t } = useI18n();
  const status = getProjectStatusConfig(value);

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.toneClass}`}>
      {getProjectStatusLabel(value, t)}
    </span>
  );
}

export function ProjectGrid({ items }: { items: ProjectSummary[] }) {
  const { t } = useI18n();

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow={t("workspaceUi.projectsEyebrow")}
        title={t("workspaceUi.visibleProjects")}
        description={t("workspaceUi.visibleProjectsDescription")}
      />
      {items.length ? (
        <>
          <div className="task-table-header">
            <span>{t("workspaceUi.project")}</span>
            <span>{t("common.status")}</span>
            <span>{t("workspaceUi.load")}</span>
            <span>{t("workspaceUi.access")}</span>
            <span>{t("common.due")}</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.map((project) => (
              <Link key={project.slug} href={`/projects/${project.slug}`} className="task-row">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="truncate text-sm font-semibold text-[var(--text-strong)]">{project.name}</h3>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{project.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                    {project.lifecycle ? (
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                        {project.lifecycle}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                      {project.members} {t("common.members")}
                    </span>
                    {project.completionRate ? <span>{project.completionRate} {t("common.complete")}</span> : null}
                  </div>
                </div>
                <div className="flex justify-start">
                  <ProjectStatusBadge value={project.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-dim)]">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">{t("common.open")} {project.open}</span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">{t("common.review")} {project.review}</span>
                  {project.blocked ? <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">{t("common.blocked")} {project.blocked}</span> : null}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{project.visibility ?? t("common.workspace")}</div>
                <div className="text-right text-sm font-medium text-[var(--text-strong)]">{project.due}</div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="px-5 py-8">
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{t("workspaceUi.noProjectsYet")}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("workspaceUi.createFirstProject")}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function TaskTable({
  items,
  title,
  description,
  projectScoped = false,
  emptyTitle,
  emptyDescription
}: {
  items: TaskRecord[];
  title?: string;
  description?: string;
  projectScoped?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("workspaceUi.taskList");
  const resolvedEmptyTitle = emptyTitle ?? t("workspaceUi.noTasksYet");
  const resolvedEmptyDescription = emptyDescription ?? t("workspaceUi.createFirstTask");

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={t("workspaceUi.tasksEyebrow")} title={resolvedTitle} description={description} />
      {items.length ? (
        <>
          <div className="task-table-header">
            <span>{t("workspaceUi.project") === t("common.workspace") ? t("workspaceUi.project") : t("workspaceUi.project")}</span>
            <span>{t("common.status")}</span>
            <span>{t("common.priority")}</span>
            <span>{t("common.owner")}</span>
            <span>{t("common.due")}</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.map((task) => {
              const health = task.assigneeType === "Agent" ? getAgentRunHealth(task, undefined, t) : null;
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
                          {t("common.subtask")}
                        </span>
                      ) : null}
                      {task.childCount ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1">
                          {task.childCount} {t("common.subtasks")}
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
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{resolvedEmptyTitle}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{resolvedEmptyDescription}</p>
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
  const { t } = useI18n();
  const activeFilters = [
    current.status ? t("workspaceUi.focusSummary", { value: statusLabel(current.status, t) }) : null,
    current.timing ? t("workspaceUi.timingSummary", { value: timingLabel(current.timing, t) }) : null,
    current.tag ? t("workspaceUi.tagSummary", { value: current.tag }) : null,
    current.sort !== "due" ? t("workspaceUi.sortSummary", { value: sortLabel(current.sort, t) }) : null
  ].filter(Boolean) as string[];
  const clearHref = buildTaskViewHref(
    basePath,
    current,
    { status: "", timing: "", tag: "", sort: "due", mode: current.mode },
    preservedParams
  );
  const modeOptions = [
    { label: t("workspaceUi.list"), value: "list" as const, icon: <StackIcon className="h-3.5 w-3.5" /> },
    { label: t("workspaceUi.board"), value: "board" as const, icon: <BoardIcon className="h-3.5 w-3.5" /> }
  ];
  const statusOptions = [
    { label: t("workspaceUi.allStatuses"), value: "" },
    { label: t("workspaceUi.todo"), value: "todo" },
    { label: t("workspaceUi.inProgress"), value: "in-progress" },
    { label: t("workspaceUi.inReview"), value: "in-review" },
    { label: t("common.blocked"), value: "blocked" }
  ];
  const timingOptions = [
    { label: t("workspaceUi.allTiming"), value: "" },
    { label: t("workspaceUi.dueSoon"), value: "due-soon" },
    { label: t("workspaceUi.overdue"), value: "overdue" }
  ];
  const sortOptions = [
    { label: t("workspaceUi.dueDate"), value: "due" },
    { label: t("common.priority"), value: "priority" },
    { label: t("workspaceUi.updated"), value: "updated" },
    { label: t("workspaceUi.created"), value: "created" }
  ];

  return (
    <Panel className="overflow-hidden p-3">
      {activeFilters.length ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">{t("common.active")}</span>
          {activeFilters.map((filter) => (
            <span
              key={filter}
              className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 text-xs font-medium text-[var(--text-strong)]"
            >
              {filter}
            </span>
          ))}
          <Link href={clearHref} className="text-xs font-medium text-[var(--accent-strong)] hover:underline">
            {t("workspaceUi.clearFilters")}
          </Link>
        </div>
      ) : null}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2 pr-1">
          <TaskViewControlLabel label={t("workspaceUi.view")} icon={<SparkIcon className="h-3.5 w-3.5" />} />
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
          <TaskViewControlLabel label={t("common.status")} icon={<SearchIcon className="h-3.5 w-3.5" />} />
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
          <TaskViewControlLabel label={t("workspaceUi.allTiming")} icon={<CalendarIcon className="h-3.5 w-3.5" />} />
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
              <TaskViewControlLabel label={t("common.tags")} icon={<FolderIcon className="h-3.5 w-3.5" />} />
              <TaskViewControlChip
                href={buildTaskViewHref(basePath, current, { tag: "" }, preservedParams)}
                label={t("workspaceUi.allTags")}
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
          <TaskViewControlLabel label={t("common.sort")} icon={<ChartIcon className="h-3.5 w-3.5" />} />
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

function statusLabel(value: string, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<string, string> = {
    "": t("workspaceUi.allStatuses"),
    todo: t("workspaceUi.todo"),
    "in-progress": t("workspaceUi.inProgress"),
    "in-review": t("workspaceUi.inReview"),
    blocked: t("common.blocked")
  };

  return labels[value] ?? value;
}

function timingLabel(value: string, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<string, string> = {
    "": t("workspaceUi.allTiming"),
    "due-soon": t("workspaceUi.dueSoon"),
    overdue: t("workspaceUi.overdue")
  };

  return labels[value] ?? value;
}

function sortLabel(value: string, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<string, string> = {
    due: t("workspaceUi.dueDate"),
    priority: t("common.priority"),
    updated: t("workspaceUi.updated"),
    created: t("workspaceUi.created")
  };

  return labels[value] ?? value;
}

export function BoardGrid({
  columns,
  title
}: {
  columns: BoardColumn[];
  title?: string;
}) {
  const { t } = useI18n();
  return <BoardGridInteractive columns={columns} title={title ?? t("workspaceUi.kanbanBoard")} />;
}

export function ActivityPanel({ items = activityFeed }: { items?: ActivityFeedItem[] }) {
  const { t } = useI18n();

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow={t("workspaceUi.activity")}
        title={t("workspaceUi.recentChanges")}
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
            {t("common.noActivityYet")}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function AgentDocsOverview() {
  const { t } = useI18n();
  return <ContextPanel title={t("workspaceUi.agentIntegrationContract")} blocks={agentDocsSections} compact />;
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
