import { notFound } from "next/navigation";
import { ProjectGovernanceForm } from "@/components/product/project-governance-form";
import { ProjectMembersForm } from "@/components/product/project-members-form";
import { PageHeader } from "@/components/product/workspace-ui";
import { getProjectMembersForUi } from "@/lib/server-data";

export default async function ProjectMembersPage({
  params
}: {
  params: { slug: string };
}) {
  const data = await getProjectMembersForUi(params.slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Project members"
        title={`${data.project.name} member scope`}
        description="Project membership is the assignment boundary for tasks in this project."
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
