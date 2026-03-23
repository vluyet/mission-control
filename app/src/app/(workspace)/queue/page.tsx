import { getTasksForUi } from "@/lib/server-data";
import { FocusQueuePanel, MetricStrip, PageHeader, TaskTable } from "@/components/product/workspace-ui";
import { getAgentRunHealth } from "@/lib/agent-run-health";

export default async function QueuePage() {
  const items = (await getTasksForUi({ agentOnly: true })).filter((task) => task.status !== "Done");
  const reviewItems = items.filter((task) => task.status === "In Review");
  const blockedItems = items.filter((task) => task.status === "Blocked");
  const activeItems = items.filter((task) => task.status === "In Progress");
  const staleItems = activeItems.filter((task) => getAgentRunHealth(task).bucket === "stale");
  const healthyActiveItems = activeItems.filter((task) => getAgentRunHealth(task).bucket !== "stale");
  const todoItems = items.filter((task) => task.status === "Todo");
  const needsAttention = [...reviewItems, ...blockedItems, ...staleItems].slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Agent Queue"
        description="Track work currently owned by agents, what needs human attention next, and where the autonomous pipeline is backing up."
      />

      <MetricStrip
        items={[
          { label: "Attention now", value: `${reviewItems.length + blockedItems.length + staleItems.length}`, detail: "Review, unblock, or inspect stalled runs", tone: reviewItems.length + blockedItems.length + staleItems.length ? "warning" : "success" },
          { label: "Running", value: `${healthyActiveItems.length}`, detail: "Active runs with recent signals", tone: healthyActiveItems.length ? "accent" : "neutral" },
          { label: "Ready to dispatch", value: `${todoItems.length}`, detail: "Agent-owned tasks not started yet", tone: todoItems.length ? "neutral" : "success" }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <FocusQueuePanel items={needsAttention} title="Needs attention now" />
        <div className="space-y-6">
          <TaskTable
            items={reviewItems}
            title="Needs review now"
            emptyTitle="Nothing is waiting for review"
            emptyDescription="Agent-completed work will surface here as soon as a human decision is needed."
          />
          <TaskTable
            items={blockedItems}
            title="Waiting on human"
            emptyTitle="No blocked agent work"
            emptyDescription="Blocked runs that need context or intervention will stay pinned here until resolved."
          />
          <TaskTable
            items={staleItems}
            title="May be stalled"
            emptyTitle="No stale runs right now"
            emptyDescription="If an active run goes quiet for too long, it will move here so you can decide whether to re-dispatch or add context."
          />
          <TaskTable
            items={healthyActiveItems.length ? healthyActiveItems : todoItems}
            title={healthyActiveItems.length ? "Running normally" : "Ready to dispatch"}
            emptyTitle="Queue is clear"
            emptyDescription={todoItems.length ? "There is agent-owned work ready to start, but nothing is currently running." : "There is no active or pending agent-owned work right now."}
          />
        </div>
      </div>
    </div>
  );
}
