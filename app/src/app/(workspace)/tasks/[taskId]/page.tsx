import { notFound } from "next/navigation";
import { getTaskWorkspaceForUi } from "@/lib/server-data";
import { TaskWorkspace } from "@/components/product/workspace-ui";
import { TaskLiveShell } from "@/components/product/task-live-shell";

export default async function TaskPage({
  params
}: {
  params: { taskId: string };
}) {
  const taskWorkspace = await getTaskWorkspaceForUi(params.taskId);

  if (!taskWorkspace) {
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
