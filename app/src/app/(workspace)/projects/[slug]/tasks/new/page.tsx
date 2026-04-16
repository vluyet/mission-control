import { notFound } from "next/navigation";
import { TaskCreateForm } from "@/components/product/task-create-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getTaskCreateFormData } from "@/lib/server-data";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function NewProjectTaskPage({
  params
}: {
  params: { slug: string };
}) {
  const data = await getTaskCreateFormData(params.slug);
  const { t } = await getRequestI18n();

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("taskForms.newTaskEyebrow")}
        title={t("taskForms.newTaskTitle", { name: data.project.name })}
        description={t("taskForms.newTaskDescription")}
      />
      <TaskCreateForm
        projectSlug={data.project.slug}
        projectName={data.project.name}
        assignees={data.assignees}
        parentOptions={data.parentOptions}
      />
    </div>
  );
}
