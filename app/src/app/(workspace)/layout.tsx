import { getWorkspaceShellDataForUi } from "@/lib/server-data";
import { ProductShell } from "@/components/product/shell-layout";
import { getDeploymentMetadata } from "@/lib/runtime-metadata";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shellData = await getWorkspaceShellDataForUi();
  const deployment = getDeploymentMetadata();
  const { locale, messages } = await getRequestI18n();

  if (!shellData) {
    return <ProductShell deployment={deployment} locale={locale} messages={messages}>{children}</ProductShell>;
  }

  return (
    <ProductShell
      currentWorkspace={shellData.currentWorkspace}
      workspaces={shellData.workspaces}
      shellCounts={shellData.shellCounts}
      activeTaskHref={shellData.activeTaskHref}
      deployment={deployment}
      locale={locale}
      messages={messages}
    >
      {children}
    </ProductShell>
  );
}
