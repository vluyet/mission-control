import { getMembersForUi } from "@/lib/server-data";
import { MemberDirectory, PageHeader } from "@/components/product/workspace-ui";
import { AppButton } from "@/components/ui/primitives";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function MembersPage() {
  const { t } = await getRequestI18n();
  const members = await getMembersForUi();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("membersPage.eyebrow")}
        title={t("membersPage.title")}
        description={t("membersPage.description")}
        actions={<AppButton tone="primary" href="/manage-workspace">{t("membersPage.manageWorkspace")}</AppButton>}
      />
      <MemberDirectory items={members} />
    </div>
  );
}
