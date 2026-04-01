import { getMembersForUi } from "@/lib/server-data";
import { MemberDirectory, PageHeader } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";

export default async function MembersPage() {
  const members = await getMembersForUi();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Members"
        description="People and agents available in this workspace."
        actions={<AppButton tone="primary" href="/manage-workspace">Manage workspace</AppButton>}
      />
      <MemberDirectory items={members} />
    </div>
  );
}
