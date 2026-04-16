import { notFound } from "next/navigation";
import { TaskEditForm } from "@/components/product/task-edit-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getTaskEditFormData } from "@/lib/server-data";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function EditTaskPage({
  params
}: {
  params: { taskId: string };
}) {
  const { t } = await getRequestI18n();
  const data = await getTaskEditFormData(params.taskId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("taskEditPage.eyebrow")}
        title={t("taskEditPage.editTaskTitle", { id: data.task.id })}
        description={t("taskEditPage.description")}
      />
      <TaskEditForm
        task={data.task}
        projectName={data.project.name}
        projectSlug={data.project.slug}
        assignees={data.assignees}
        parentOptions={data.parentOptions}
      />
    </div>
  );
}
