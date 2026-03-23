import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi, getTaskWorkspaceForUi } from "@/lib/server-data";
import { PageHeader, TaskWorkspace } from "@/components/product/workspace-ui";
import { TaskLiveShell } from "@/components/product/task-live-shell";

export default async function ProjectTaskPage({
  params
}: {
  params: { slug: string; taskId: string };
}) {
  const [projectWorkspace, taskWorkspace] = await Promise.all([
    getProjectWorkspaceForUi(params.slug),
    getTaskWorkspaceForUi(params.taskId)
  ]);

  if (!projectWorkspace || !taskWorkspace || taskWorkspace.task.projectSlug !== projectWorkspace.project.slug) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project task"
        title={`${projectWorkspace.project.name} · ${taskWorkspace.task.id}`}
        description="Dedicated task route inside project context, with comments, activity, and execution surfaces preserved."
      />
      <TaskLiveShell taskId={taskWorkspace.task.id} status={taskWorkspace.task.status} assigneeType={taskWorkspace.task.assigneeType}>
        <TaskWorkspace
          task={taskWorkspace.task}
          comments={taskWorkspace.comments}
          timeline={taskWorkspace.timeline}
          executionFeed={taskWorkspace.executionFeed}
          executionMeta={taskWorkspace.executionMeta}
          attachments={taskWorkspace.attachments}
          childTasks={taskWorkspace.childTasks}
          resolvedContext={taskWorkspace.resolvedContext}
          watchers={taskWorkspace.watchers}
          availableWatchers={taskWorkspace.availableWatchers}
        />
      </TaskLiveShell>
    </div>
  );
}
