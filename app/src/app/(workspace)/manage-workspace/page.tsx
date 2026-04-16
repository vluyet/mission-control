import { PageHeader } from "@/components/product/workspace-ui";
import { WorkspaceManageForm } from "@/components/product/workspace-manage-form";
import { getRequestI18n } from "@/lib/i18n/server";
import { getWorkspaceManagementDataForUi } from "@/lib/server-data";
import { AppButton, Panel } from "@/components/ui/primitives";

export default async function ManageWorkspacePage() {
  const { t } = await getRequestI18n();
  const data = await getWorkspaceManagementDataForUi();

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow={t("manageWorkspace.workspace")} title={t("manageWorkspace.manageWorkspaceTitle")} />
        <Panel className="px-6 py-6">
          <div className="max-w-xl space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">{t("manageWorkspace.workspaceUnavailable")}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t("manageWorkspace.workspaceUnavailableDescription")}
            </p>
            <div className="pt-1">
              <AppButton tone="secondary" href="/projects">
                {t("manageWorkspace.openProjects")}
              </AppButton>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("manageWorkspace.workspace")} title={t("manageWorkspace.manageWorkspaceTitle")} />
      <WorkspaceManageForm workspace={data.workspace} />
    </div>
  );
}
