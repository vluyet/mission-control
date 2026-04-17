import { getLocalizedAgentDocsSections, getLocalizedWorkspaceContextBlock } from "@/lib/demo-data";
import { AgentDocsOverview, ContextPanel, PageHeader } from "@/components/product/workspace-ui";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translator";

export default async function AgentDocsPage() {
  const t = createTranslator(en);
  const messages = en;
  const workspaceContextBlock = getLocalizedWorkspaceContextBlock(messages);
  const resolutionSections = getLocalizedAgentDocsSections(messages);
  const implementedResources = messages.agentDocsPage.implementedResources;
  const localizedSamplePayloads = messages.agentDocsPage.samplePayloads;
  const exportItems = messages.agentDocsPage.exportItems;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t("agentDocsPage.eyebrow")}
        title={t("agentDocsPage.title")}
        description={t("agentDocsPage.description")}
        actions={
          <>
            <AppButton tone="secondary" href="/api/docs/agents">
              {t("agentDocsPage.readJsonSummary")}
            </AppButton>
            <AppButton tone="primary" href="/api/docs/agents/contract">
              {t("agentDocsPage.exportContract")}
            </AppButton>
          </>
        }
      />

      <ContextPanel title={t("agentDocsPage.workspaceContextTitle")} blocks={[workspaceContextBlock]} />
      <AgentDocsOverview />

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("agentDocsPage.apiShapeEyebrow")}
          title={t("agentDocsPage.implementedResourcesTitle")}
          description={t("agentDocsPage.implementedResourcesDescription")}
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {implementedResources.map((item) => (
            <div key={item.title} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <p className="font-mono text-sm text-[var(--text-strong)]">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("agentDocsPage.examplesEyebrow")}
          title={t("agentDocsPage.samplePayloadsTitle")}
          description={t("agentDocsPage.samplePayloadsDescription")}
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {localizedSamplePayloads.map((item) => (
            <div key={item.title} className="rounded-3xl border border-[var(--line)] bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{item.title}</h3>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 font-mono text-xs leading-6 text-[var(--text-strong)]">
                {item.code}
              </pre>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("agentDocsPage.resolutionModelEyebrow")}
          title={t("agentDocsPage.howTasksFindContextTitle")}
          description={t("agentDocsPage.howTasksFindContextDescription")}
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-3">
          {resolutionSections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-[var(--line)] bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{section.summary}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("agentDocsPage.exportsEyebrow")}
          title={t("agentDocsPage.machineReadableOutputsTitle")}
          description={t("agentDocsPage.machineReadableOutputsDescription")}
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {exportItems.map((item) => (
            <div key={item.title} className="rounded-3xl border border-[var(--line)] bg-white p-4">
              <p className="font-mono text-sm text-[var(--text-strong)]">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
