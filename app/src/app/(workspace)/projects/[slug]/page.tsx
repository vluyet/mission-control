import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi } from "@/lib/server-data";
import { BoardGrid, FocusQueuePanel, PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";
import { applyTaskView, buildBoardColumns, getTagOptions, parseTaskViewState } from "@/lib/task-view";
import { getAgentRunHealth } from "@/lib/agent-run-health";

export default async function ProjectWorkspacePage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const workspace = await getProjectWorkspaceForUi(params.slug);
  const view = parseTaskViewState(searchParams);

  if (!workspace?.workspaceContext) {
    notFound();
  }
  const { project, tasks } = workspace;
  const visibleTasks = applyTaskView(tasks, view);
  const tags = getTagOptions(tasks);
  const reviewItems = visibleTasks.filter((task) => task.status === "In Review");
  const blockedItems = visibleTasks.filter((task) => task.status === "Blocked");
  const staleItems = visibleTasks.filter((task) => task.assigneeType === "Agent" && task.status === "In Progress" && getAgentRunHealth(task).bucket === "stale");
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems].slice(0, 6);
  const visibleBoard = buildBoardColumns(visibleTasks);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={project.description}
        actions={
          <>
            <AppButton tone="secondary" href={`/projects/${project.slug}/members`}>
              Project access
            </AppButton>
            <AppButton tone="secondary" href={`/projects/${project.slug}/edit`}>
              Edit project
            </AppButton>
            <AppButton tone="primary" href={`/projects/${project.slug}/tasks/new`}>
              Add task
            </AppButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">
            {project.lifecycle}
          </span>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">
            {project.visibility}
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
          <BoardGrid columns={visibleBoard} title="Board" />
        ) : attentionItems.length ? (
          <div className="space-y-6">
            <FocusQueuePanel items={attentionItems} title="Needs attention" />
            <TaskTable items={visibleTasks} projectScoped title="Project tasks" />
          </div>
        ) : (
          <TaskTable items={visibleTasks} projectScoped title="Project tasks" />
        )}
      </div>
    </div>
  );
}
