import { getTasksForUi } from "@/lib/server-data";
import { FocusQueuePanel, MetricStrip, PageHeader, TaskTable } from "@/components/product/workspace-ui";

export default async function QueuePage() {
  const items = (await getTasksForUi({ agentOnly: true })).filter((task) => task.status !== "Done");
  const reviewItems = items.filter((task) => task.status === "In Review");
  const blockedItems = items.filter((task) => task.status === "Blocked");
  const activeItems = items.filter((task) => task.status === "In Progress");
  const todoItems = items.filter((task) => task.status === "Todo");
  const needsAttention = [...reviewItems, ...blockedItems, ...activeItems].slice(0, 6);

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
          { label: "In review", value: `${reviewItems.length}`, detail: "Ready for a human decision", tone: "warning" },
          { label: "Blocked", value: `${blockedItems.length}`, detail: "Need intervention or clarified context", tone: blockedItems.length ? "warning" : "success" },
          { label: "Running", value: `${activeItems.length}`, detail: "Currently in progress", tone: activeItems.length ? "success" : "neutral" }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <FocusQueuePanel items={needsAttention} title="Needs attention now" />
        <TaskTable
          items={reviewItems.length ? reviewItems : items}
          title={reviewItems.length ? "Ready for review" : "All active agent work"}
          emptyTitle={todoItems.length ? "No tasks waiting for review yet" : "No active agent work"}
          emptyDescription={todoItems.length ? "Agents still have work in todo or in progress. Check back as tasks finish." : "Dispatch a task to OpenClaw to start filling this queue."}
        />
      </div>
    </div>
  );
}
