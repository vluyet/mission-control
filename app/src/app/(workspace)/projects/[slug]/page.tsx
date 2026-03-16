import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi } from "@/lib/server-data";
import { BoardGrid, ContextPanel, PageHeader, TaskTable, TaskViewToolbar, TaskWorkspace } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";
import { applyTaskView, getTagOptions, parseTaskViewState } from "@/lib/task-view";
import { SavedTaskViews } from "@/components/product/saved-task-views";

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
  const { project, workspaceContext, projectContext, tasks, board, featuredTask } = workspace;
  const visibleTasks = applyTaskView(tasks, view);
  const tags = getTagOptions(tasks);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project overview"
        title={project.name}
        actions={
          <>
            <AppButton tone="secondary" href={`/projects/${project.slug}/members`}>
              Project access
            </AppButton>
            <AppButton tone="primary" href={`/projects/${project.slug}/tasks/new`}>
              Add task
            </AppButton>
          </>
        }
      />

      <div className="grid gap-4 2xl:grid-cols-[1.12fr,0.88fr]">
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
          <SavedTaskViews storageKey={`saved-view:project:${project.slug}`} basePath={`/projects/${project.slug}`} current={view} />
          <TaskViewToolbar basePath={`/projects/${project.slug}`} current={view} tagOptions={tags} includeTags />
          <TaskTable
            items={visibleTasks}
            projectScoped
            title="Project task list"
          />
        </div>
        <BoardGrid columns={board} title="Project board" />
      </div>

      {featuredTask ? (
        <TaskWorkspace
          task={featuredTask.task}
          comments={featuredTask.comments}
          timeline={featuredTask.timeline}
          executionFeed={featuredTask.executionFeed}
          attachments={featuredTask.attachments}
          childTasks={featuredTask.childTasks}
          resolvedContext={featuredTask.resolvedContext}
          watchers={featuredTask.watchers}
          availableWatchers={featuredTask.availableWatchers}
        />
      ) : null}
    </div>
  );
}
