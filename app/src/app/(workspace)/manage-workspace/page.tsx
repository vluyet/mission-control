import { PageHeader } from "@/components/product/workspace-ui";
import { WorkspaceManageForm } from "@/components/product/workspace-manage-form";
import { getWorkspaceManagementDataForUi } from "@/lib/server-data";
import { AppButton, Panel } from "@/components/ui/primitives";

export default async function ManageWorkspacePage() {
  const data = await getWorkspaceManagementDataForUi();

  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Workspace" title="Manage workspace" />
        <Panel className="px-6 py-6">
          <div className="max-w-xl space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">Workspace unavailable</h2>
            <p className="text-sm text-[var(--text-muted)]">
              The active workspace could not be loaded. Return to the main workspace surfaces and try again.
            </p>
            <div className="pt-1">
              <AppButton tone="secondary" href="/projects">
                Open projects
              </AppButton>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title="Manage workspace" />
      <WorkspaceManageForm workspace={data.workspace} />
    </div>
  );
}
