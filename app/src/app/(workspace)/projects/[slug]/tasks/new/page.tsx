import { notFound } from "next/navigation";
import { TaskCreateForm } from "@/components/product/task-create-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getTaskCreateFormData } from "@/lib/server-data";

export default async function NewProjectTaskPage({
  params
}: {
  params: { slug: string };
}) {
  const data = await getTaskCreateFormData(params.slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="New task"
        title={`${data.project.name} · Create task`}
        description="Tasks should be quick to add, with assignment kept inside the project member boundary."
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
