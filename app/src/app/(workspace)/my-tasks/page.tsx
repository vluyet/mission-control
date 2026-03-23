import { getMyTasksForUi } from "@/lib/server-data";
import { PageHeader, MetricStrip, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
import { SavedTaskViews } from "@/components/product/saved-task-views";
import { applyTaskView, buildBoardColumns, getTagOptions, parseTaskViewState } from "@/lib/task-view";

export default async function MyTasksPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const items = await getMyTasksForUi();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view = parseTaskViewState(resolvedSearchParams);
  const visibleItems = applyTaskView(items, view);
  const tagOptions = getTagOptions(items);
  const boardColumns = buildBoardColumns(visibleItems);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ownership"
        title="My Tasks"
        description="A unified workspace for work assigned to you and autonomous work currently owned by agents. Filter by timing, status, tag, or layout to focus the day."
      />

      <MetricStrip
        items={[
          { label: "Open tasks", value: `${items.filter((task) => task.status !== "Done").length}`, detail: "Across you and active agents", tone: "accent" },
          { label: "Due soon", value: `${items.filter((task) => task.due !== "No date").length}`, detail: "Tasks with an explicit due date", tone: "neutral" },
          { label: "Agents active", value: `${new Set(items.filter((task) => task.assigneeType === "Agent").map((task) => task.assignee)).size}`, detail: "Agents currently carrying work", tone: "success" },
          { label: "Review queue", value: `${items.filter((task) => task.status === "In Review").length}`, detail: "Tasks waiting for review", tone: "warning" }
        ]}
      />

      <TaskViewToolbar basePath="/my-tasks" current={view} includeTags tagOptions={tagOptions} />
      <SavedTaskViews storageKey="my-tasks-views" basePath="/my-tasks" current={view} />

      {view.mode === "board" ? (
        <BoardGridInteractive
          columns={boardColumns}
          title="Visible work"
          description="Group the currently visible tasks by status to spot bottlenecks and ownership at a glance."
        />
      ) : (
        <TaskTable
          items={visibleItems}
          title="Visible work"
          emptyTitle="Nothing matches this view"
          emptyDescription="Adjust filters or switch to board view to inspect the rest of your workload."
        />
      )}
    </div>
  );
}
