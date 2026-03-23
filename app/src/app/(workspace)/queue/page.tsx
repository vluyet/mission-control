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
          { label: "Agent tasks", value: `${items.length}`, detail: "Open work currently assigned to agents", tone: "accent" },
          { label: "Needs review", value: `${reviewItems.length}`, detail: "Ready for a human decision", tone: reviewItems.length ? "warning" : "success" },
          { label: "Waiting on human", value: `${blockedItems.length}`, detail: "Need intervention or clarified context", tone: blockedItems.length ? "warning" : "success" },
          { label: "May be stalled", value: `${staleItems.length}`, detail: "In progress without a recent signal", tone: staleItems.length ? "warning" : "success" }
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
            items={blockedItems.length ? blockedItems : staleItems.length ? staleItems : healthyActiveItems.length ? healthyActiveItems : todoItems}
            title={blockedItems.length ? "Waiting on human" : staleItems.length ? "May be stalled" : healthyActiveItems.length ? "Running normally" : "Ready to dispatch"}
            emptyTitle="Queue is clear"
            emptyDescription={todoItems.length ? "Agent-owned tasks are ready, but none are actively running yet." : "There is no blocked, stale, or active agent work right now."}
          />
        </div>
      </div>
    </div>
  );
}
