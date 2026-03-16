import { getTasksForUi } from "@/lib/server-data";
import { EmptyState, PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { applyTaskView, getTagOptions, parseTaskViewState } from "@/lib/task-view";
import { AppButton } from "@/components/ui/primitives";
import { SavedTaskViews } from "@/components/product/saved-task-views";

export default async function QueuePage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const mode = Array.isArray(searchParams?.view) ? searchParams?.view[0] : searchParams?.view;
  const queueMode = mode === "agents" ? "agents" : "review";
  const view = parseTaskViewState(searchParams);
  const queueTasks = await getTasksForUi(queueMode === "agents" ? { agentOnly: true } : { status: "review" });
  const visibleTasks = applyTaskView(queueTasks, view);
  const tags = getTagOptions(queueTasks);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Queues"
        title={queueMode === "agents" ? "Agent queue" : "Review queue"}
        actions={
          <>
            <AppButton tone={queueMode === "review" ? "primary" : "secondary"} href="/queue">
              Review queue
            </AppButton>
            <AppButton tone={queueMode === "agents" ? "primary" : "secondary"} href="/queue?view=agents">
              Agent queue
            </AppButton>
          </>
        }
      />
      {queueTasks.length ? (
        <>
          <SavedTaskViews
            storageKey={`saved-view:queue:${queueMode}`}
            basePath="/queue"
            current={view}
            preservedParams={queueMode === "agents" ? { view: "agents" } : {}}
          />
          <TaskViewToolbar
            basePath="/queue"
            current={view}
            tagOptions={tags}
            includeTags
            preservedParams={queueMode === "agents" ? { view: "agents" } : {}}
          />
          {visibleTasks.length ? (
            <TaskTable
              items={visibleTasks}
              title={queueMode === "agents" ? "Agent-owned tasks" : "Review-ready tasks"}
              emptyTitle="No tasks match this view"
              emptyDescription="Adjust filters or wait for new work to enter this queue."
            />
          ) : (
            <EmptyState
              title="No tasks match this view"
              description="Adjust filters or wait for work to enter this queue."
            />
          )}
        </>
      ) : (
        <EmptyState
          title={queueMode === "agents" ? "Agent queue is empty" : "Review queue is empty"}
          description={queueMode === "agents" ? "Agent-owned tasks will appear here when automation work starts." : "Tasks moved to review will appear here."}
        />
      )}
    </div>
  );
}
