import { getMyTasksForUi } from "@/lib/server-data";
import { PageHeader, TaskTable, TaskViewToolbar } from "@/components/product/workspace-ui";
import { BoardGridInteractive } from "@/components/product/board-grid-interactive";
import { SavedTaskViews } from "@/components/product/saved-task-views";
import { applyTaskView, buildBoardColumns, getTagOptions, getTaskStatusKey, parseTaskViewState } from "@/lib/task-view";
import { getAgentRunHealth } from "@/lib/agent-run-health";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function MyTasksPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getRequestI18n();
  const items = await getMyTasksForUi();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view = parseTaskViewState(resolvedSearchParams);
  const visibleItems = applyTaskView(items, view);
  const tagOptions = getTagOptions(items);
  const boardColumns = buildBoardColumns(visibleItems, {
    todo: t("common.todo"),
    inProgress: t("common.inProgress"),
    inReview: t("common.inReview"),
    blocked: t("common.blocked"),
    done: t("common.done")
  });
  const reviewCount = visibleItems.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "inReview").length;
  const blockedCount = visibleItems.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === "blocked").length;
  const staleCount = visibleItems.filter(
    (task) => (task.rawAssigneeType ?? task.assigneeType) === "Agent" && getTaskStatusKey(task.rawStatus ?? task.status) === "inProgress" && getAgentRunHealth(task, undefined, t).bucket === "stale"
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("myTasksPage.eyebrow")}
        title={t("myTasksPage.title")}
        description={t("myTasksPage.description")}
      />

      <TaskViewToolbar basePath="/my-tasks" current={view} includeTags tagOptions={tagOptions} />
      <SavedTaskViews storageKey="my-tasks-views" basePath="/my-tasks" current={view} />

      {view.mode === "board" ? (
        <BoardGridInteractive
          columns={boardColumns}
          title={t("myTasksPage.visibleWork")}
          description={t("myTasksPage.groupedByStatus")}
        />
      ) : (
        <TaskTable
          items={visibleItems}
          title={t("myTasksPage.visibleWork")}
          description={t("myTasksPage.visibleWorkDescription", { reviewCount, blockedCount, staleCount })}
          emptyTitle={t("myTasksPage.nothingMatches")}
          emptyDescription={t("myTasksPage.adjustFilters")}
        />
      )}
    </div>
  );
}
