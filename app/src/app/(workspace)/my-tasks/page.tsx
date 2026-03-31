import { getMyTasksForUi } from "@/lib/server-data";
import { FocusQueuePanel, PageHeader, MetricStrip, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
import { SavedTaskViews } from "@/components/product/saved-task-views";
import { applyTaskView, buildBoardColumns, getTagOptions, parseTaskViewState } from "@/lib/task-view";
import { getAgentRunHealth } from "@/lib/agent-run-health";

export default async function MyTasksPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const items = await getMyTasksForUi();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view = parseTaskViewState(resolvedSearchParams);
  const visibleItems = applyTaskView(items, view);
  const tagOptions = getTagOptions(items);
  const boardColumns = buildBoardColumns(visibleItems);
  const openItems = items.filter((task) => task.status !== "Done");
  const reviewItems = visibleItems.filter((task) => task.status === "In Review");
  const blockedItems = visibleItems.filter((task) => task.status === "Blocked");
  const staleItems = visibleItems.filter((task) => task.assigneeType === "Agent" && task.status === "In Progress" && getAgentRunHealth(task).bucket === "stale");
  const attentionIds = new Set([...reviewItems, ...blockedItems, ...staleItems].map((task) => task.id));
  const remainingItems = visibleItems.filter((task) => !attentionIds.has(task.id));
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems].slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tasks"
        title="My Tasks"
        description="Your work queue across personal and agent-owned tasks."
      />

      <TaskViewToolbar basePath="/my-tasks" current={view} includeTags tagOptions={tagOptions} />
      <SavedTaskViews storageKey="my-tasks-views" basePath="/my-tasks" current={view} />

      {view.mode === "board" ? (
        <BoardGridInteractive
          columns={boardColumns}
          title="Visible work"
          description="Grouped by status."
        />
      ) : attentionItems.length ? (
        <div className="space-y-6">
          <FocusQueuePanel items={attentionItems} title="Needs attention" />
          <TaskTable
            items={visibleItems}
            title="All visible tasks"
            emptyTitle="Nothing matches this view"
            emptyDescription="Adjust filters or switch to board view."
          />
        </div>
      ) : (
        <TaskTable
          items={visibleItems}
          title="Visible work"
          emptyTitle="Nothing matches this view"
          emptyDescription="Adjust filters or switch to board view."
        />
      )}
    </div>
  );
}
