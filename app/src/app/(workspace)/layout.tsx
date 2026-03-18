import { getWorkspaceShellDataForUi } from "@/lib/server-data";
import { ProductShell } from "@/components/product/shell-layout";
import { getDeploymentMetadata } from "@/lib/runtime-metadata";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellData = await getWorkspaceShellDataForUi();
  const deployment = getDeploymentMetadata();

  if (!shellData) {
    return <ProductShell deployment={deployment}>{children}</ProductShell>;
  }

  return (
    <ProductShell
      currentWorkspace={shellData.currentWorkspace}
      workspaces={shellData.workspaces}
      shellCounts={shellData.shellCounts}
      activeTaskHref={shellData.activeTaskHref}
      deployment={deployment}
    >
      {children}
    </ProductShell>
  );
}
