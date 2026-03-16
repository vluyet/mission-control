import { notFound } from "next/navigation";
import { TaskEditForm } from "@/components/product/task-edit-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getTaskEditFormData } from "@/lib/server-data";

export default async function EditTaskPage({
  params
}: {
  params: { taskId: string };
}) {
  const data = await getTaskEditFormData(params.taskId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Task edit"
        title={`${data.task.id} · Edit task`}
        description="Update the core task metadata without expanding the workflow model beyond what the product needs today."
      />
      <TaskEditForm
        task={data.task}
        projectName={data.project.name}
        assignees={data.assignees}
        parentOptions={data.parentOptions}
      />
    </div>
  );
}
