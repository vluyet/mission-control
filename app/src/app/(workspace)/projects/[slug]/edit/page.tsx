import { notFound } from "next/navigation";
import { getProjectEditDataForUi } from "@/lib/server-data";
import { ProjectEditForm } from "@/components/product/project-edit-form";
import { PageHeader } from "@/components/product/workspace-ui";

export default async function ProjectEditPage({
  params
}: {
  params: { slug: string };
}) {
  const project = await getProjectEditDataForUi(params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project"
        title={`Edit ${project.name}`}
        description="Update project details, lifecycle, and visibility. Delete the project from the danger zone below."
      />
      <ProjectEditForm project={project} />
    </div>
  );
}
