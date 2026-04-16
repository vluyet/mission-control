import { PageHeader } from "@/components/product/workspace-ui";
import { ProjectCreateForm } from "@/components/product/project-create-form";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function NewProjectPage() {
  const { t } = await getRequestI18n();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("newProjectPage.eyebrow")}
        title={t("newProjectPage.title")}
        description={t("newProjectPage.description")}
      />
      <ProjectCreateForm />
    </div>
  );
}
