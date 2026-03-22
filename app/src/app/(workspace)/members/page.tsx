import { getMembersForUi } from "@/lib/server-data";
import { MemberDirectory, PageHeader } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";

export default async function MembersPage() {
  const members = await getMembersForUi();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Members"
        title="Members"
        description="People and agents available in the active workspace. Advanced controls live in Settings."
        actions={<AppButton tone="primary" href="/manage-workspace">Open settings</AppButton>}
      />
      <MemberDirectory items={members} />
    </div>
  );
}
