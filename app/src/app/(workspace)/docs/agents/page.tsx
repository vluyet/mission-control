import { agentDocsSections, workspaceContext } from "@/lib/demo-data";
import { AgentDocsOverview, ContextPanel, PageHeader } from "@/components/product/workspace-ui";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export default function AgentDocsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Agent docs"
        title="Documentation for future autonomous agent usage."
        description="Tasks inherit workspace and project context, autonomous clients authenticate through scoped bearer credentials, and OpenClaw-discovered agents can be synced into the workspace."
        actions={
          <>
            <AppButton tone="secondary" href="/api/docs/agents">
              Read JSON summary
            </AppButton>
            <AppButton tone="primary" href="/api/docs/agents/contract">
              Export contract
            </AppButton>
          </>
        }
      />

      <ContextPanel title="Workspace context source of truth" blocks={[workspaceContext]} />
      <AgentDocsOverview />

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow="API shape"
          title="Implemented resources"
          description="These endpoints are live now and reflect the same context model shown in the product UI."
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {[
            {
              title: "GET /api/workspaces/default/context",
              body: "Returns workspace-level context, policies, members, and top-level operational norms."
            },
            {
              title: "GET /api/projects/:slug/context",
              body: "Returns project-level context, scope, success criteria, and linked workspace inheritance."
            },
            {
              title: "POST /api/projects",
              body: "Creates a new project in the default workspace using a compact mutation payload and a simple visibility rule."
            },
            {
              title: "PATCH /api/projects/:slug",
              body: "Updates project lifecycle and visibility without introducing a heavy admin system."
            },
            {
              title: "GET /api/projects/:slug/members",
              body: "Reads the explicit member scope for a project along with project roles, lifecycle, and visibility settings."
            },
            {
              title: "PUT /api/projects/:slug/members",
              body: "Replaces the project member scope and role map that task assignment depends on."
            },
            {
              title: "PATCH /api/members/:memberId",
              body: "Updates workspace role metadata and, for agents, enabled state plus action permissions."
            },
            {
              title: "POST /api/workspaces/current/agent-credentials",
              body: "Creates a scoped bearer credential for an enabled agent member. Tokens are returned once at creation."
            },
            {
              title: "PATCH /api/agent-credentials/:credentialId",
              body: "Enables or revokes an existing agent credential without changing the underlying member record."
            },
            {
              title: "PATCH /api/workspaces/current/openclaw",
              body: "Registers OpenClaw discovery settings using either CLI discovery or a mounted openclaw.json source. The dashboard URL is stored as operator metadata only."
            },
            {
              title: "POST /api/workspaces/current/openclaw/sync",
              body: "Discovers OpenClaw agents and syncs them into workspace agent members with source attribution."
            },
            {
              title: "GET /api/search?q=:query",
              body: "Searches projects and tasks in the active workspace through a stable API surface instead of UI scraping."
            },
            {
              title: "POST /api/projects/:slug/tasks",
              body: "Creates a task inside project context with assignment restricted to project members."
            },
            {
              title: "GET /api/tasks/:taskId",
              body: "Returns task metadata plus resolved context so humans and agents see the same operational frame."
            },
            {
              title: "PATCH /api/tasks/:taskId",
              body: "Updates the task's core metadata through a stable mutation endpoint. Human and agent transitions now follow explicit actor-type workflow rules."
            },
            {
              title: "GET /api/tasks/:taskId/watchers",
              body: "Reads the follower list for a task so humans and agents can monitor work without becoming the assignee."
            },
            {
              title: "PUT /api/tasks/:taskId/watchers",
              body: "Replaces the watcher list for a task. Watchers are collaboration followers, not task owners."
            },
            {
              title: "GET /api/tasks/:taskId/attachments",
              body: "Reads attachment metadata for a task so clients can discover files without scraping the task page."
            },
            {
              title: "POST /api/tasks/:taskId/attachments",
              body: "Uploads a file onto a task using the local storage contract. Attachments stay separate from comments and execution logs, and can be attributed to an enabled agent."
            },
            {
              title: "GET /api/attachments/:attachmentId",
              body: "Downloads a stored task attachment by id."
            },
            {
              title: "GET /api/attachments/:attachmentId/preview",
              body: "Streams supported files inline so humans can inspect common image, pdf, and text outputs without leaving the product."
            },
            {
              title: "GET /api/tasks/:taskId/context",
              body: "Returns only the deterministic context resolution payload so orchestration can load working context without extra task surface data."
            },
            {
              title: "POST /api/tasks/:taskId/comments",
              body: "Creates a human-facing comment. Separate from machine execution logs and compatible with inline @Name mentions."
            },
            {
              title: "PATCH /api/tasks/:taskId/comments/:commentId",
              body: "Edits an existing human comment while keeping comment history separate from activity and execution channels."
            },
            {
              title: "GET /api/tasks/:taskId/activity",
              body: "Returns audit-style activity entries for the task."
            },
            {
              title: "GET /api/tasks/:taskId/execution",
              body: "Returns machine-facing execution logs for the task."
            },
            {
              title: "POST /api/tasks/:taskId/execution",
              body: "Appends a machine-facing execution log line."
            },
            {
              title: "GET /api/docs/agents",
              body: "Returns the current machine-readable integration contract for this app."
            },
            {
              title: "GET /api/docs/agents/contract",
              body: "Exports a constrained contract bundle for autonomous clients that need explicit resource semantics and response shapes."
            }
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <p className="font-mono text-sm text-[var(--text-strong)]">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow="Examples"
          title="Sample payloads"
          description="A future agent orchestrator should be able to use these contracts without relying on UI scraping."
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {[
            {
              title: "Read task with resolved context",
              code: `GET /api/tasks/<taskId>`
            },
            {
              title: "Read task context only",
              code: `GET /api/tasks/<taskId>/context`
            },
            {
              title: "Create project",
              code: `POST /api/projects\n{\n  "name": "Ops Expansion",\n  "description": "New workstream for ops automation.",\n  "startDate": "2026-03-18",\n  "endDate": "2026-03-28",\n  "visibility": "project_members"\n}`
            },
            {
              title: "Update project governance",
              code: `PATCH /api/projects/<projectSlug>\n{\n  "visibility": "project_members",\n  "status": "archived"\n}`
            },
            {
              title: "Set project members",
              code: `PUT /api/projects/<projectSlug>/members\n{\n  "membershipIds": ["member_a", "member_b"],\n  "memberRoles": {\n    "member_a": "lead",\n    "member_b": "observer"\n  }\n}`
            },
            {
              title: "Disable an agent",
              code: `PATCH /api/members/member_builder\n{\n  "enabled": false\n}`
            },
            {
              title: "Create agent credential",
              code: `POST /api/workspaces/current/agent-credentials\n{\n  "membershipId": "member_builder",\n  "name": "Builder runner",\n  "scopes": ["tasks.read", "tasks.write", "comments.write"]\n}`
            },
            {
              title: "Register OpenClaw integration",
              code: `PATCH /api/workspaces/current/openclaw\n{\n  "label": "Primary OpenClaw",\n  "dashboardUrl": "https://control.openclaw.local",\n  "enabled": true,\n  "discoveryMode": "config_file",\n  "configPath": "/workspace/openclaw/openclaw.json"\n}`
            },
            {
              title: "Sync OpenClaw agents",
              code: `POST /api/workspaces/current/openclaw/sync`
            },
            {
              title: "Update agent permissions",
              code: `PATCH /api/members/member_builder\n{\n  "agentPermissions": ["comment", "change_status"]\n}`
            },
            {
              title: "Update workspace role",
              code: `PATCH /api/members/member_nora\n{\n  "workspaceRole": "admin"\n}`
            },
            {
              title: "Create task in project",
              code: `POST /api/projects/<projectSlug>/tasks\n{\n  "title": "Prepare review queue handoff",\n  "status": "todo",\n  "priority": "medium",\n  "assigneeId": "member_a",\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["Board", "Review"]\n}`
            },
            {
              title: "Advance agent workflow",
              code: `PATCH /api/tasks/<taskId>\n{\n  "status": "review",\n  "actorType": "agent"\n}`
            },
            {
              title: "Advance human workflow",
              code: `PATCH /api/tasks/<taskId>\n{\n  "status": "in_progress",\n  "actorType": "human"\n}`
            },
            {
              title: "Restructure a task",
              code: `PATCH /api/tasks/<taskId>\n{\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["List View", "UX"]\n}`
            },
            {
              title: "Set task watchers",
              code: `PUT /api/tasks/<taskId>/watchers\n{\n  "membershipIds": ["member_builder", "member_owner"]\n}`
            },
            {
              title: "Upload task attachment",
              code: `POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: workspace-layout-notes.txt\n- artifactType: reference`
            },
            {
              title: "Upload agent output artifact",
              code: `POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: execution-summary.md\n- artifactType: output\n- actorType: agent\n- actorName: <agentName>`
            },
            {
              title: "Preview supported artifact inline",
              code: `GET /api/attachments/attachment_123/preview`
            },
            {
              title: "Post human-facing comment",
              code: `POST /api/tasks/<taskId>/comments\n{\n  "author": "<actorName>",\n  "role": "Agent",\n  "tone": "agent",\n  "body": "Execution completed. Ready for review."\n}`
            },
            {
              title: "Edit a human comment",
              code: `PATCH /api/tasks/<taskId>/comments/<commentId>\n{\n  "body": "Updated copy after reviewing @Workspace Owner feedback."\n}`
            },
            {
              title: "Append execution log",
              code: `POST /api/tasks/<taskId>/execution\n{\n  "line": "Collected project context and began implementation."\n}`
            },
            {
              title: "Read project context",
              code: `GET /api/projects/<projectSlug>/context`
            },
            {
              title: "Search the active workspace",
              code: `GET /api/search?q=review`
            }
          ].map((item) => (
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
          eyebrow="Resolution model"
          title="How tasks find context"
          description="This is the simple model we should preserve as the app grows."
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
          eyebrow="Exports"
          title="Machine-readable outputs"
          description="Autonomous clients should not need to scrape this page. Exportable contract endpoints are part of the product now."
        />
        <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
          {[
            {
              title: "/api/docs/agents",
              body: "High-level JSON summary of current resources, principles, and example resolution semantics."
            },
            {
              title: "/api/docs/agents/contract",
              body: "Constrained contract bundle with resource semantics, request shapes, and response-shape hints for autonomous usage."
            },
            {
              title: "Operational rule",
              body: "Agent capabilities describe what an agent is good at. Agent permissions define what an agent is allowed to do in the product."
            },
            {
              title: "Workflow rule",
              body: "Task transitions are now actor-aware: human operators and agent actors have different allowed paths through the same status model."
            }
          ].map((item) => (
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
