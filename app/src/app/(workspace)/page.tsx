import {
  getActivityFeedForUi,
  getDashboardMetricsForUi,
  getProjectsForUi,
  getTasksForUi
} from "@/lib/server-data";
import {
  ActivityPanel,
  EmptyState,
  FocusQueuePanel,
  MetricStrip,
  PageHeader,
  ProjectSnapshotPanel
} from "@/components/product/workspace-ui";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export default async function DashboardPage() {
  const [projects, metrics, activity, tasks] = await Promise.all([
    getProjectsForUi(),
    getDashboardMetricsForUi(),
    getActivityFeedForUi(5),
    getTasksForUi()
  ]);
  const homeMetrics = metrics.filter((metric) => metric.label !== "Agent throughput");
  const focusTasks = tasks
    .filter((task) => task.status === "Blocked" || task.status === "In Review" || task.due === "Today" || task.due === "Tomorrow")
    .slice(0, 5);
  const visibleProjects = projects.slice(0, 4);
  const isEmptyWorkspace = projects.length === 0 && tasks.length === 0 && activity.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace home"
        title="Overview"
        actions={
          <AppButton tone="primary" href={isEmptyWorkspace ? "/manage-workspace" : "/projects/new"}>
            {isEmptyWorkspace ? "Manage workspace" : "New project"}
          </AppButton>
        }
      />
      {isEmptyWorkspace ? (
        <div className="grid gap-4 2xl:grid-cols-[1.05fr,0.95fr]">
          <EmptyState
            title="Workspace is ready"
            description="Add your workspace context, then create the first project when you are ready to start."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AppButton tone="primary" href="/manage-workspace">
                  Manage workspace
                </AppButton>
                <AppButton tone="secondary" href="/projects/new">
                  Create first project
                </AppButton>
              </div>
            }
          />
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Setup" title="First steps" />
            <div className="space-y-3 px-5 py-5">
              {[
                "Define workspace context and shared rules.",
                "Invite people and add agents only when they are needed.",
                "Create the first project, then add tasks from that project."
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : (
        <>
          <MetricStrip items={homeMetrics} />
          <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
            <FocusQueuePanel items={focusTasks} />
            <ProjectSnapshotPanel items={visibleProjects} />
          </div>
          <ActivityPanel items={activity} />
        </>
      )}
    </div>
  );
}
