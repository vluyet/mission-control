import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi } from "@/lib/server-data";
import { BoardGrid, ContextPanel, FocusQueuePanel, PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
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
  const { project, workspaceContext, projectContext, tasks } = workspace;
  const visibleTasks = applyTaskView(tasks, view);
  const tags = getTagOptions(tasks);
  const reviewItems = visibleTasks.filter((task) => task.status === "In Review");
  const blockedItems = visibleTasks.filter((task) => task.status === "Blocked");
  const staleItems = visibleTasks.filter((task) => task.assigneeType === "Agent" && task.status === "In Progress" && getAgentRunHealth(task).bucket === "stale");
  const attentionIds = new Set([...reviewItems, ...blockedItems, ...staleItems].map((task) => task.id));
  const remainingItems = visibleTasks.filter((task) => !attentionIds.has(task.id));
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems].slice(0, 6);
  const visibleBoard = buildBoardColumns(visibleTasks);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project overview"
        title={project.name}
        description="Use the filtered task view as the main working area. Review-ready, blocked, and stale work rises to the top when the current view needs human attention." 
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

        <ContextPanel
          title="Project context"
          blocks={[workspaceContext, projectContext ?? undefined]}
        />

        <TaskViewToolbar
          basePath={`/projects/${project.slug}`}
          current={view}
          tagOptions={tags}
          includeTags
          savedViewsKey={`saved-view:project:${project.slug}`}
        />

        {view.mode === "board" ? (
          <BoardGrid columns={visibleBoard} title="Board snapshot" />
        ) : attentionItems.length ? (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
            <FocusQueuePanel items={attentionItems} title="Project attention" />
            <div className="space-y-6">
              <TaskTable
                items={reviewItems}
                projectScoped
                title="Needs review"
                emptyTitle="Nothing needs review in this project view"
                emptyDescription="Review-ready work will surface here whenever the current filters include it."
              />
              <TaskTable
                items={blockedItems}
                projectScoped
                title="Waiting on human"
                emptyTitle="No blocked work in this project view"
                emptyDescription="Blocked tasks that need context or a decision stay grouped here."
              />
              <TaskTable
                items={staleItems}
                projectScoped
                title="May be stalled"
                emptyTitle="No stale agent runs in this project view"
                emptyDescription="Quiet in-progress agent work only shows here when the current filters still include it."
              />
              <TaskTable
                items={remainingItems}
                projectScoped
                title="Everything else"
                emptyTitle="Only attention items match this project view"
                emptyDescription="Adjust filters or switch to board view to inspect the rest of the project."
              />
            </div>
          </div>
        ) : (
          <TaskTable items={visibleTasks} projectScoped title="Project tasks" />
        )}
      </div>
    </div>
  );
}
