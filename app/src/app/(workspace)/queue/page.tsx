import { getTasksForUi } from "@/lib/server-data";
import { MetricStrip, PageHeader, TaskTable } from "@/components/product/workspace-ui";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import { getRequestI18n } from "@/lib/i18n/server";
import { getTaskStatusKey } from "@/lib/task-view";

export default async function QueuePage() {
  const { t } = await getRequestI18n();
  const items = (await getTasksForUi({ agentOnly: true })).filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) !== "done");
  const reviewItems = items.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "inReview");
  const blockedItems = items.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "blocked");
  const activeItems = items.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "inProgress");
  const staleItems = activeItems.filter((task) => getAgentRunHealth(task).bucket === "stale");
  const healthyActiveItems = activeItems.filter((task) => getAgentRunHealth(task).bucket !== "stale");
  const todoItems = items.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "todo");
  const attentionItems = [...reviewItems, ...blockedItems, ...staleItems];
  const flowItems = healthyActiveItems.length ? healthyActiveItems : todoItems;
  const queueDescriptionParts = [
    reviewItems.length ? t("queuePage.inReviewCount", { count: reviewItems.length }) : null,
    blockedItems.length ? t("queuePage.blockedCount", { count: blockedItems.length }) : null,
    staleItems.length ? t("queuePage.staleCount", { count: staleItems.length }) : null,
    healthyActiveItems.length ? t("queuePage.runningCount", { count: healthyActiveItems.length }) : null,
    !healthyActiveItems.length && todoItems.length ? t("queuePage.readyToDispatchCount", { count: todoItems.length }) : null
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("queuePage.eyebrow")}
        title={t("queuePage.title")}
        description={t("queuePage.description")}
      />

      <MetricStrip
        items={[
          { label: t("queuePage.attentionNow"), value: `${attentionItems.length}`, detail: t("queuePage.attentionNowDetail"), tone: attentionItems.length ? "warning" : "success" },
          { label: t("queuePage.running"), value: `${healthyActiveItems.length}`, detail: t("queuePage.runningDetail"), tone: healthyActiveItems.length ? "accent" : "neutral" },
          { label: t("queuePage.readyToDispatch"), value: `${todoItems.length}`, detail: t("queuePage.readyToDispatchDetail"), tone: todoItems.length ? "neutral" : "success" }
        ]}
      />

      <div className="space-y-6">
        <TaskTable
          items={attentionItems}
          title={t("queuePage.needsAttention")}
          description={queueDescriptionParts.length ? queueDescriptionParts.join(" · ") : t("queuePage.noAttentionDescription")}
          emptyTitle={t("queuePage.nothingNeedsAttention")}
          emptyDescription={t("queuePage.nothingNeedsAttentionDescription")}
        />
        <TaskTable
          items={flowItems}
          title={healthyActiveItems.length ? t("queuePage.runningNormally") : t("queuePage.readyToDispatch")}
          description={healthyActiveItems.length ? t("queuePage.runningNormallyDescription") : t("queuePage.readyToDispatchDescription")}
          emptyTitle={t("queuePage.queueIsClear")}
          emptyDescription={todoItems.length ? t("queuePage.queueClearWithTodo") : t("queuePage.queueClearWithoutWork")}
        />
      </div>
    </div>
  );
}
