import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi } from "@/lib/server-data";
import { BoardGrid, FocusQueuePanel, PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { AppButton } from "@/components/ui/primitives";
import { applyTaskView, buildBoardColumns, getTagOptions, getTaskStatusKey, parseTaskViewState } from "@/lib/task-view";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function ProjectWorkspacePage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const workspace = await getProjectWorkspaceForUi(params.slug);
  const view = parseTaskViewState(searchParams);
  const { t } = await getRequestI18n();

  if (!workspace?.workspaceContext) {
    notFound();
  }
  const { project, tasks } = workspace;
  const visibleTasks = applyTaskView(tasks, view);
  const tags = getTagOptions(tasks);
  const reviewItems = visibleTasks.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "inReview");
  const blockedItems = visibleTasks.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "blocked");
  const staleItems = visibleTasks.filter((task) => (task.rawAssigneeType ?? task.assigneeType) === "Agent" && getTaskStatusKey(task.rawStatus ?? task.status) === "inProgress" && getAgentRunHealth(task).bucket === "stale");
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems].slice(0, 6);
  const visibleBoard = buildBoardColumns(visibleTasks, {
    todo: t("common.todo"),
    inProgress: t("common.inProgress"),
    inReview: t("common.inReview"),
    blocked: t("common.blocked"),
    done: t("common.done")
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("workspaceUi.project")}
        title={project.name}
        description={project.description ? <MarkdownContent markdown={project.description} className="text-sm leading-6 text-[var(--text-muted)]" /> : undefined}
        actions={
          <>
            <AppButton tone="secondary" href={`/projects/${project.slug}/members`}>
              {t("projectForms.projectAccess")}
            </AppButton>
            <AppButton tone="secondary" href={`/projects/${project.slug}/edit`}>
              {t("projectForms.editProject")}
            </AppButton>
            <AppButton tone="primary" href={`/projects/${project.slug}/tasks/new`}>
              {t("projectForms.addTask")}
            </AppButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">
            {project.rawLifecycle === "archived" ? t("projectForms.archived") : t("common.active")}
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">
            {project.rawVisibility === "project_members" ? t("projectForms.visibleToProjectMembersOnly") : t("projectForms.visibleToWorkspace")}
          </span>
        </div>


        <TaskViewToolbar
          basePath={`/projects/${project.slug}`}
          current={view}
          tagOptions={tags}
          includeTags
          savedViewsKey={`saved-view:project:${project.slug}`}
        />

        {view.mode === "board" ? (
          <BoardGrid columns={visibleBoard} title={t("workspaceUi.board")} />
        ) : attentionItems.length ? (
          <div className="space-y-6">
            <FocusQueuePanel items={attentionItems} title={t("workspaceUi.needsAttention")} />
            <TaskTable items={visibleTasks} projectScoped title={t("projectForms.projectTasks")} />
          </div>
        ) : (
          <TaskTable items={visibleTasks} projectScoped title={t("projectForms.projectTasks")} />
        )}
      </div>
    </div>
  );
}
