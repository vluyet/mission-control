import { getTasksForUi } from "@/lib/server-data";
import { MetricStrip, PageHeader, TaskTable } from "@/components/product/workspace-ui";
import { getAgentRunHealth } from "@/lib/agent-run-health";

export default async function QueuePage() {
  const items = (await getTasksForUi({ agentOnly: true })).filter((task) => task.status !== "Done");
  const reviewItems = items.filter((task) => task.status === "In Review");
  const blockedItems = items.filter((task) => task.status === "Blocked");
  const activeItems = items.filter((task) => task.status === "In Progress");
  const staleItems = activeItems.filter((task) => getAgentRunHealth(task).bucket === "stale");
  const healthyActiveItems = activeItems.filter((task) => getAgentRunHealth(task).bucket !== "stale");
  const todoItems = items.filter((task) => task.status === "Todo");
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems];
  const flowItems = healthyActiveItems.length ? healthyActiveItems : todoItems;
  const queueDescriptionParts = [
    reviewItems.length ? `${reviewItems.length} in review` : null,
    blockedItems.length ? `${blockedItems.length} blocked` : null,
    staleItems.length ? `${staleItems.length} stale` : null,
    healthyActiveItems.length ? `${healthyActiveItems.length} running` : null,
    !healthyActiveItems.length && todoItems.length ? `${todoItems.length} ready to dispatch` : null
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Agent Queue"
        description="Compact operational view of agent-owned work, attention items, and active flow."
      />

      <MetricStrip
        items={[
          { label: "Attention now", value: `${attentionItems.length}`, detail: "Review, unblock, or inspect stalled runs", tone: attentionItems.length ? "warning" : "success" },
          { label: "Running", value: `${healthyActiveItems.length}`, detail: "Active runs with recent signals", tone: healthyActiveItems.length ? "accent" : "neutral" },
          { label: "Ready to dispatch", value: `${todoItems.length}`, detail: "Agent-owned tasks not started yet", tone: todoItems.length ? "neutral" : "success" }
        ]}
      />

      <div className="space-y-6">
        <TaskTable
          items={attentionItems}
          title="Needs attention"
          description={queueDescriptionParts.length ? queueDescriptionParts.join(" · ") : "No review, blocked, or stale agent work right now."}
          emptyTitle="Nothing needs attention"
          emptyDescription="Review, blocked, and stale agent-owned work will collect here in one queue."
        />
        <TaskTable
          items={flowItems}
          title={healthyActiveItems.length ? "Running normally" : "Ready to dispatch"}
          description={healthyActiveItems.length ? "Active agent runs with recent signals and no immediate intervention needed." : "Agent-owned tasks that are ready to start once capacity is available."}
          emptyTitle="Queue is clear"
          emptyDescription={todoItems.length ? "There is agent-owned work ready to start, but nothing is currently running." : "There is no active or pending agent-owned work right now."}
        />
      </div>
    </div>
  );
}
