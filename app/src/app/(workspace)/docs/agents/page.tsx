import { agentDocsSections, workspaceContext } from "@/lib/demo-data";
import { AgentDocsOverview, ContextPanel, PageHeader } from "@/components/product/workspace-ui";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { getRequestI18n } from "@/lib/i18n/server";

const samplePayloads = [
  { code: `GET /api/tasks/<taskId>` },
  { code: `GET /api/tasks/<taskId>/context` },
  {
    code: `POST /api/projects\n{\n  "name": "Ops Expansion",\n  "description": "New workstream for ops automation.",\n  "startDate": "2026-03-18",\n  "endDate": "2026-03-28",\n  "visibility": "project_members"\n}`
  },
  {
    code: `PATCH /api/projects/<projectSlug>\n{\n  "visibility": "project_members",\n  "status": "archived"\n}`
  },
  {
    code: `PUT /api/projects/<projectSlug>/members\n{\n  "membershipIds": ["member_a", "member_b"],\n  "memberRoles": {\n    "member_a": "lead",\n    "member_b": "observer"\n  }\n}`
  },
  { code: `PATCH /api/members/member_builder\n{\n  "enabled": false\n}` },
  {
    code: `POST /api/workspaces/current/agent-credentials\n{\n  "membershipId": "member_builder",\n  "name": "Builder runner",\n  "scopes": ["tasks.read", "tasks.write", "comments.write"]\n}`
  },
  {
    code: `PATCH /api/members/member_builder\n{\n  "agentPermissions": ["comment", "change_status"]\n}`
  },
  { code: `PATCH /api/members/member_nora\n{\n  "workspaceRole": "admin"\n}` },
  {
    code: `POST /api/projects/<projectSlug>/tasks\n{\n  "title": "Prepare review queue handoff",\n  "status": "todo",\n  "priority": "medium",\n  "assigneeId": "member_a",\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["Board", "Review"]\n}`
  },
  { code: `PATCH /api/tasks/<taskId>\n{\n  "status": "review",\n  "actorType": "agent"\n}` },
  { code: `PATCH /api/tasks/<taskId>\n{\n  "status": "in_progress",\n  "actorType": "human"\n}` },
  {
    code: `PATCH /api/tasks/<taskId>\n{\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["List View", "UX"]\n}`
  },
  { code: `PUT /api/tasks/<taskId>/watchers\n{\n  "membershipIds": ["member_builder", "member_owner"]\n}` },
  {
    code: `POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: workspace-layout-notes.txt\n- artifactType: reference`
  },
  {
    code: `POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: execution-summary.md\n- artifactType: output\n- actorType: agent\n- actorName: <agentName>`
  },
  { code: `GET /api/attachments/attachment_123/preview` },
  {
    code: `POST /api/tasks/<taskId>/comments\n{\n  "author": "<actorName>",\n  "role": "<agentRole>",\n  "tone": "agent",\n  "body": "<commentBody>"\n}`
  },
  {
    code: `PATCH /api/tasks/<taskId>/comments/<commentId>\n{\n  "body": "Updated copy after reviewing @<ownerName> feedback."\n}`
  },
  {
    code: `POST /api/tasks/<taskId>/execution\n{\n  "line": "Collected project context and began implementation."\n}`
  },
  { code: `GET /api/projects/<projectSlug>/context` },
  { code: `GET /api/search?q=review` }
] as const;

export default async function AgentDocsPage() {
  const { t, messages } = await getRequestI18n();
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

      <ContextPanel title={t("agentDocsPage.workspaceContextTitle")} blocks={[workspaceContext]} />
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
          {samplePayloads.map((item, index) => {
            const localized = localizedSamplePayloads[index];
            return (
              <div key={localized?.title ?? item.code} className="rounded-3xl border border-[var(--line)] bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{localized?.title ?? item.code}</h3>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 font-mono text-xs leading-6 text-[var(--text-strong)]">
                  {localized?.code ?? item.code}
                </pre>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("agentDocsPage.resolutionModelEyebrow")}
          title={t("agentDocsPage.howTasksFindContextTitle")}
          description={t("agentDocsPage.howTasksFindContextDescription")}
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-3">
          {agentDocsSections.map((section) => (
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
