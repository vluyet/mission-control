import { notFound } from "next/navigation";
import { getProjectEditDataForUi } from "@/lib/server-data";
import { ProjectEditForm } from "@/components/product/project-edit-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function ProjectEditPage({
  params
}: {
  params: { slug: string };
}) {
  const project = await getProjectEditDataForUi(params.slug);
  const { t } = await getRequestI18n();

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("projectForms.editEyebrow")}
        title={t("projectForms.editPageTitle", { name: project.name })}
        description={t("projectForms.editPageDescription")}
      />
      <ProjectEditForm project={project} />
    </div>
  );
}
