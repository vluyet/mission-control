import { notFound } from "next/navigation";
import { getProjectWorkspaceForUi, getTaskWorkspaceForUi } from "@/lib/server-data";
import { TaskWorkspace } from "@/components/product/workspace-ui";
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
    <TaskLiveShell
      taskId={taskWorkspace.task.id}
      status={taskWorkspace.task.status}
      assigneeType={taskWorkspace.task.assigneeType}
      assigneeSourceSystem={taskWorkspace.task.assigneeSourceSystem}
    >
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
  );
}
