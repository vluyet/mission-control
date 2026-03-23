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
        eyebrow="Ownership"
        title="My Tasks"
        description="A unified workspace for work assigned to you and autonomous work currently owned by agents. Filter by timing, status, tag, or layout to focus the day."
      />

      <MetricStrip
        items={[
          { label: "Open tasks", value: `${openItems.length}`, detail: "Across you and active agents", tone: "accent" },
          { label: "Needs attention", value: `${items.filter((task) => task.status === "In Review" || task.status === "Blocked").length}`, detail: "Review or unblock decisions waiting on you", tone: items.some((task) => task.status === "In Review" || task.status === "Blocked") ? "warning" : "success" },
          { label: "Agent runs", value: `${items.filter((task) => task.assigneeType === "Agent" && task.status === "In Progress").length}`, detail: "Currently active autonomous work", tone: "neutral" }
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
      ) : attentionItems.length ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
          <FocusQueuePanel items={attentionItems} title="Needs your attention" />
          <div className="space-y-6">
            <TaskTable
              items={reviewItems}
              title="Needs review"
              emptyTitle="Nothing needs review in this view"
              emptyDescription="Review-ready work will surface here when the current filters include it."
            />
            <TaskTable
              items={blockedItems}
              title="Waiting on you"
              emptyTitle="No blocked tasks in this view"
              emptyDescription="Tasks that need human input or a clarifying decision will appear here."
            />
            <TaskTable
              items={staleItems}
              title="May be stalled"
              emptyTitle="No stale agent runs in this view"
              emptyDescription="Quiet agent work only surfaces here when the current filters still include it."
            />
            <TaskTable
              items={remainingItems}
              title="Everything else"
              emptyTitle="Only attention items match this view"
              emptyDescription="Adjust filters or switch to board view to inspect the rest of your workload."
            />
          </div>
        </div>
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
