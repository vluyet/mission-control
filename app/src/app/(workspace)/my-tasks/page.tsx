import { getMyTasksForUi } from "@/lib/server-data";
import { EmptyState, PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";
import { applyTaskView, getTagOptions, parseTaskViewState } from "@/lib/task-view";
import { SavedTaskViews } from "@/components/product/saved-task-views";

export default async function MyTasksPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const view = parseTaskViewState(searchParams);
  const items = await getMyTasksForUi();
  const visibleItems = applyTaskView(items, view);
  const tags = getTagOptions(items);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="My tasks"
        title="My tasks"
        actions={<AppButton tone="secondary" href="/projects">Open projects</AppButton>}
      />
      {items.length ? (
        <>
          <SavedTaskViews storageKey="saved-view:my-tasks" basePath="/my-tasks" current={view} />
          <TaskViewToolbar basePath="/my-tasks" current={view} tagOptions={tags} includeTags />
          <TaskTable
            items={visibleItems}
            title="Assigned"
            emptyTitle="No tasks match this view"
            emptyDescription="Adjust filters or create new tasks from a project."
          />
        </>
      ) : (
        <EmptyState
          title="No assigned tasks"
          description="Tasks assigned to you or your agents will appear here."
          action={
            <AppButton tone="secondary" href="/projects">
              Open projects
            </AppButton>
          }
        />
      )}
    </div>
  );
}
