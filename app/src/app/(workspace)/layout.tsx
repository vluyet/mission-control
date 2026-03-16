import { getWorkspaceShellDataForUi } from "@/lib/server-data";
import { ProductShell } from "@/components/product/shell-layout";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellData = await getWorkspaceShellDataForUi();

  if (!shellData) {
    return <ProductShell>{children}</ProductShell>;
  }

  return (
    <ProductShell
      currentWorkspace={shellData.currentWorkspace}
      workspaces={shellData.workspaces}
      shellCounts={shellData.shellCounts}
      activeTaskHref={shellData.activeTaskHref}
    >
      {children}
    </ProductShell>
  );
}
