import { notFound } from "next/navigation";
import { ProjectGovernanceForm } from "@/components/product/project-governance-form";
import { ProjectMembersForm } from "@/components/product/project-members-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getProjectMembersForUi } from "@/lib/server-data";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function ProjectMembersPage({
  params
}: {
  params: { slug: string };
}) {
  const data = await getProjectMembersForUi(params.slug);
  const { t } = await getRequestI18n();

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("projectForms.membersEyebrow")}
        title={t("projectForms.memberScopeTitle", { name: data.project.name })}
        description={t("projectForms.memberScopeDescription")}
      />
      <ProjectMembersForm
        projectSlug={data.project.slug}
        projectName={data.project.name}
        members={data.members}
        selectedMemberIds={data.selectedMemberIds}
        selectedRoles={data.selectedRoles}
      />
      <ProjectGovernanceForm
        projectSlug={data.project.slug}
        projectName={data.project.name}
        initialStatus={data.project.status}
        initialVisibility={data.project.visibility}
      />
    </div>
  );
}
