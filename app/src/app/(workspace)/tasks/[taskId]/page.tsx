import { notFound } from "next/navigation";
import { getTaskWorkspaceForUi } from "@/lib/server-data";
import { PageHeader, TaskWorkspace } from "@/components/product/workspace-ui";

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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Task"
        title={`${taskWorkspace.task.id} · ${taskWorkspace.task.title}`}
      />
      <TaskWorkspace
        task={taskWorkspace.task}
        comments={taskWorkspace.comments}
        timeline={taskWorkspace.timeline}
        executionFeed={taskWorkspace.executionFeed}
        attachments={taskWorkspace.attachments}
        childTasks={taskWorkspace.childTasks}
        resolvedContext={taskWorkspace.resolvedContext}
        watchers={taskWorkspace.watchers}
        availableWatchers={taskWorkspace.availableWatchers}
      />
    </div>
  );
}
