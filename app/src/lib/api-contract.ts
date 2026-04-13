import { agentDocsSections, workspaceContext } from "@/lib/demo-data";

export function apiMeta() {
  return {
    generated_at: new Date().toISOString(),
    mode: "launch-prep",
    version: "2026-03-16"
  };
}

export function getAgentDocsPayload() {
  return {
    summary:
      "Mission Control is being shaped so agents can operate against stable task, project, and execution contracts without relying on UI scraping.",
    auth: {
      owner: "Cookie-backed owner session for product access.",
      agent: "Bearer token credentials scoped per agent member for API access.",
      notes: [
        "Agent credentials are created from Manage Workspace.",
        "Tokens are shown once at creation time.",
        "Agent scopes gate read and write API access."
      ]
    },
    principles: agentDocsSections,
    resources: [
      {
        method: "GET",
        path: "/api/workspaces/default/context",
        purpose: "Read workspace context and operational rules."
      },
      {
        method: "GET",
        path: "/api/projects/:slug/context",
        purpose: "Read project scope and inherited workspace context."
      },
      {
        method: "POST",
        path: "/api/projects",
        purpose: "Create a new project in the default workspace with a simple visibility rule."
      },
      {
        method: "GET",
        path: "/api/projects/:slug",
        purpose: "Read project governance settings including lifecycle and visibility."
      },
      {
        method: "PATCH",
        path: "/api/projects/:slug",
        purpose: "Update project lifecycle and visibility without changing routes or task structure."
      },
      {
        method: "GET",
        path: "/api/projects/:slug/members",
        purpose: "Read the current project member scope and available workspace members."
      },
      {
        method: "PUT",
        path: "/api/projects/:slug/members",
        purpose: "Replace the member scope for a project."
      },
      {
        method: "PATCH",
        path: "/api/members/:memberId",
        purpose: "Update workspace role metadata and, for agents, manage enabled state and allowed action permissions."
      },
      {
        method: "GET",
        path: "/api/workspaces/current/constructor",
        purpose: "Read the active Constructor workspace integration settings."
      },
      {
        method: "PATCH",
        path: "/api/workspaces/current/constructor",
        purpose: "Create or update the active Constructor workspace integration settings."
      },
      {
        method: "POST",
        path: "/api/workspaces/current/constructor/sync",
        purpose: "Discover available agents through Constructor public API and sync them into workspace members for Constructor use."
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/dispatch",
        purpose:
          "Owner-only Constructor dispatch using a server-authored Mission Control prompt. Dispatch is rejected when the task description is too underspecified for safe agent execution."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/constructor/status",
        purpose: "Poll Constructor execution state for an in-flight dispatched task and sync the local Mission Control task status."
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/callback",
        purpose: "Receive Constructor completion callbacks and project the final response into Mission Control comments and execution state."
      },
      {
        method: "GET",
        path: "/api/workspaces/current/agent-credentials",
        purpose: "Owner-only listing of issued agent credentials and available scopes."
      },
      {
        method: "POST",
        path: "/api/workspaces/current/agent-credentials",
        purpose: "Create a scoped bearer credential for an enabled agent member."
      },
      {
        method: "PATCH",
        path: "/api/agent-credentials/:credentialId",
        purpose: "Enable or revoke an existing agent credential."
      },
      {
        method: "GET",
        path: "/api/search?q=:query",
        purpose: "Search tasks and projects inside the active workspace."
      },
      {
        method: "POST",
        path: "/api/projects/:slug/tasks",
        purpose: "Create a task inside a project with assignee options constrained to project members."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId",
        purpose: "Read task metadata with resolved workspace and project context."
      },
      {
        method: "PATCH",
        path: "/api/tasks/:taskId",
        purpose: "Update core task metadata from a stable mutation endpoint, including actor-type workflow rules and permission checks."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/watchers",
        purpose: "Read follower/watcher membership for a task without mixing it into assignment ownership."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/attachments",
        purpose: "Read attachment metadata for a task."
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/attachments",
        purpose: "Upload a file onto a task using the Docker-local storage contract, including agent-attributed output uploads."
      },
      {
        method: "GET",
        path: "/api/attachments/:attachmentId",
        purpose: "Download a stored task attachment by id."
      },
      {
        method: "GET",
        path: "/api/attachments/:attachmentId/preview",
        purpose: "Preview supported image, document, and text artifact types inline."
      },
      {
        method: "PUT",
        path: "/api/tasks/:taskId/watchers",
        purpose: "Replace the task watcher list so humans and agents can follow work without owning it."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/context",
        purpose: "Read the deterministic context resolution payload for a task."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/comments",
        purpose: "Read human-facing discussion."
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/comments",
        purpose: "Append a human-facing comment."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/activity",
        purpose: "Read audit-style task history."
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/execution",
        purpose: "Read machine-facing execution logs."
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/execution",
        purpose: "Append an execution log entry."
      },
      {
        method: "GET",
        path: "/api/docs/agents",
        purpose: "Read the current human-readable and machine-readable integration summary."
      },
      {
        method: "GET",
        path: "/api/docs/agents/contract",
        purpose: "Export a constrained machine-readable contract bundle for autonomous clients."
      }
    ],
    exports: [
      {
        format: "json",
        path: "/api/docs/agents"
      },
      {
        format: "contract-json",
        path: "/api/docs/agents/contract"
      }
    ],
    workspace_context: workspaceContext,
    context_resolution: null,
    recent_activity: []
  };
}

export function getAgentContractPayload() {
  return {
    contract: "mission-control-agent-api",
    version: "2026-03-16",
    description:
      "Machine-readable contract bundle for autonomous clients. Keep this stable, additive, and easier to consume than UI pages.",
    semantics: {
      authentication: {
        owner: "Authenticated product routes and owner-only APIs use the mission_control_session cookie.",
        agent: "Scoped API access uses Authorization: Bearer <token>.",
        notes: [
          "Owner-only admin endpoints do not accept agent credentials.",
          "Agent tokens are scope-limited and revocable.",
          "Workspace Constructor linking is owner-only and stores integration tokens server-side."
        ]
      },
      context_resolution: {
        resolution_order: ["workspace", "project", "task"],
        notes: [
          "Workspace defines broad operational rules.",
          "Project narrows scope and can override workspace fields.",
          "Task adds a focused hint and should not duplicate inherited context."
        ]
      },
      channels: {
        comments: "Human-facing communication.",
        activity: "Audit history of meaningful task events.",
        execution: "Machine-facing run state and logs."
      }
    },
    resources: {
      workspace_context: {
        method: "GET",
        path: "/api/workspaces/default/context",
        response_shape: ["workspace.id", "workspace.name", "workspace.context", "workspace.members[]"]
      },
      project_context: {
        method: "GET",
        path: "/api/projects/:slug/context",
        response_shape: ["project.slug", "project.context", "project.inherited_workspace_context"]
      },
      project_create: {
        method: "POST",
        path: "/api/projects",
        request_shape: ["name", "description?", "startDate?", "endDate?", "visibility?"]
      },
      project_governance: {
        method: "PATCH",
        path: "/api/projects/:slug",
        request_shape: ["status?", "visibility?"],
        notes: [
          "visibility is constrained to workspace or project_members.",
          "status is constrained to active or archived."
        ]
      },
      project_members: {
        method: "GET",
        path: "/api/projects/:slug/members",
        response_shape: ["project.slug", "project.status", "project.visibility", "selectedMemberIds[]", "selectedRoles{}", "members[]"]
      },
      project_members_update: {
        method: "PUT",
        path: "/api/projects/:slug/members",
        request_shape: ["membershipIds[]", "memberRoles{}"],
        notes: [
          "Project roles are lead, member, and observer.",
          "Observer project members can follow work but cannot own tasks."
        ]
      },
      constructor_link_read: {
        method: "GET",
        path: "/api/workspaces/current/constructor",
        response_shape: ["integration.id", "integration.baseUrl", "integration.enabled", "integration.apiTokenConfigured", "integration.callbackTokenConfigured"]
      },
      constructor_link: {
        method: "PATCH",
        path: "/api/workspaces/current/constructor",
        request_shape: ["label?", "baseUrl", "apiToken?", "callbackToken?", "enabled?"],
        notes: [
          "Owner-authenticated reads return stored workspace apiToken and callbackToken values so generated tokens can be revealed and copied again from Manage Workspace.",
          "Leave apiToken blank on update to keep the existing saved token.",
          "Leave callbackToken blank on update to keep the existing saved token.",
          "Constructor's current public API does not sign callbacks, so callbackToken is stored but not enforced on callback delivery."
        ]
      },
      constructor_sync: {
        method: "POST",
        path: "/api/workspaces/current/constructor/sync",
        response_shape: ["integration", "agents[]"],
        notes: [
          "Mission Control calls Constructor GET /api/v1/agents for the active workspace.",
          "Synced agents are created or updated as workspace agent members with sourceSystem=constructor."
        ]
      },
      constructor_dispatch: {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/dispatch",
        response_shape: ["dispatch.bridgeExecutionId", "dispatch.externalTaskId", "dispatch.executionState", "dispatch.accepted"],
        notes: [
          "Owner-authenticated only.",
          "Dispatch uses the assigned Constructor agent when present, otherwise the synced default Constructor agent.",
          "Mission Control authors the final human-facing prompt and keeps task comments and state as the source of truth."
        ]
      },
      constructor_status: {
        method: "GET",
        path: "/api/tasks/:taskId/constructor/status",
        response_shape: ["tracked", "active", "refresh", "summary?"],
        notes: [
          "Polls Constructor execution state using the last tracked bridgeExecutionId.",
          "Mission Control appends deduplicated execution log lines as state changes arrive."
        ]
      },
      constructor_callback: {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/callback",
        response_shape: ["ok", "commentId?", "duplicate?"],
        notes: [
          "Receives Constructor terminal callbacks for previously dispatched tasks.",
          "Mission Control deduplicates repeated callbacks and writes the final answer into task comments as the responding agent."
        ]
      },
      member_update: {
        method: "PATCH",
        path: "/api/members/:memberId",
        request_shape: ["workspaceRole?", "enabled?", "agentPermissions?"],
        notes: [
          "Workspace roles can be updated for any member.",
          "Only agent members can be enabled, disabled, or permission-scoped through this endpoint.",
          "Supported permissions are comment, change_status, and log_execution."
        ]
      },
      agent_credentials: {
        method: "POST",
        path: "/api/workspaces/current/agent-credentials",
        request_shape: ["membershipId", "name", "scopes[]"],
        notes: [
          "Returns a newly created token once.",
          "Only owner-authenticated clients can create or revoke credentials."
        ]
      },
      agent_credential_update: {
        method: "PATCH",
        path: "/api/agent-credentials/:credentialId",
        request_shape: ["enabled"]
      },
      search: {
        method: "GET",
        path: "/api/search?q=:query",
        response_shape: ["query", "projects[]", "tasks[]", "total"],
        notes: ["Search is currently scoped to projects and tasks in the active workspace."]
      },
      task_create: {
        method: "POST",
        path: "/api/projects/:slug/tasks",
        request_shape: ["title", "description?", "status?", "priority?", "assigneeId?", "parentTaskId?", "tags[]?", "startDate?", "dueDate?"],
        notes: [
          "Assignees must belong to the project.",
          "Viewer workspace members and observer project members cannot own tasks.",
          "Parent tasks must belong to the same project."
        ]
      },
      task: {
        method: "GET",
        path: "/api/tasks/:taskId",
        response_shape: [
          "task.id",
          "task.title",
          "task.status",
          "task.priority",
          "resolved_context",
          "comments[]",
          "activity[]",
          "execution"
        ]
      },
      task_attachments: {
        method: "GET",
        path: "/api/tasks/:taskId/attachments",
        response_shape: ["task_id", "attachments[].id", "attachments[].href", "attachments[].previewHref?", "attachments[].artifactType"]
      },
      task_attachment_create: {
        method: "POST",
        path: "/api/tasks/:taskId/attachments",
        request_shape: ["file", "artifactType?", "actorType?"],
        notes: [
          "actorType supports human and agent.",
          "Agent-attributed uploads require the named actor to resolve to an enabled agent in the task workspace.",
          "Agent uploads are useful for generated outputs and deliverables."
        ]
      },
      attachment_preview: {
        method: "GET",
        path: "/api/attachments/:attachmentId/preview",
        response_shape: ["binary inline response"],
        notes: ["Supported preview types currently include images, pdf, text, markdown, json, and xml files."]
      },
      task_context: {
        method: "GET",
        path: "/api/tasks/:taskId/context",
        response_shape: ["task_id", "project_slug", "context.resolution_order", "context.layers", "context.merged", "context.trace"]
      },
      task_update: {
        method: "PATCH",
        path: "/api/tasks/:taskId",
        request_shape: ["title?", "description?", "status?", "priority?", "assigneeId?", "parentTaskId?", "tags[]?", "startDate?", "dueDate?", "blockedReason?", "actorType?"],
        notes: [
          "Disabled agents cannot be assigned.",
          "Viewer-role members cannot own tasks.",
          "Observer project members cannot own tasks.",
          "Human-triggered transitions and agent-triggered transitions are validated against different workflow policies.",
          "Agent-owned tasks follow a constrained status model: todo -> in_progress -> review/done or blocked.",
          "Agent-owned transitions require the change_status permission.",
          "When an agent-owned task reaches done and the agent can comment, a human-readable completion summary is posted automatically."
        ]
      },
      task_watchers: {
        method: "GET",
        path: "/api/tasks/:taskId/watchers",
        response_shape: ["watchers[]", "availableWatchers[]"]
      },
      task_watchers_update: {
        method: "PUT",
        path: "/api/tasks/:taskId/watchers",
        request_shape: ["membershipIds[]"],
        notes: ["Watchers follow a task without becoming the assignee."]
      },
      task_attachment_upload: {
        method: "POST",
        path: "/api/tasks/:taskId/attachments",
        request_shape: ["multipart:file", "artifactType?", "actorType?", "actorName?"],
        notes: [
          "Files are stored on the Docker-local app filesystem through a simple storage contract.",
          "Agent-attributed uploads require an enabled agent actor in the same task workspace."
        ]
      },
      attachment_download: {
        method: "GET",
        path: "/api/attachments/:attachmentId",
        response_shape: ["binary file response"]
      },
      task_comments: {
        method: "GET",
        path: "/api/tasks/:taskId/comments"
      },
      task_comment_create: {
        method: "POST",
        path: "/api/tasks/:taskId/comments",
        request_shape: ["author", "role", "tone", "body"],
        notes: [
          "Agent-authored comments require the comment permission.",
          "Inline @Name mentions are preserved as part of the comment body for human-facing coordination."
        ]
      },
      task_comment_update: {
        method: "PATCH",
        path: "/api/tasks/:taskId/comments/:commentId",
        request_shape: ["body"],
        notes: ["This version supports editing human-authored comments while keeping activity history intact."]
      },
      task_activity: {
        method: "GET",
        path: "/api/tasks/:taskId/activity"
      },
      task_execution: {
        method: "GET",
        path: "/api/tasks/:taskId/execution"
      },
      task_execution_append: {
        method: "POST",
        path: "/api/tasks/:taskId/execution",
        request_shape: ["line"],
        notes: ["Appending execution logs requires the log_execution permission."]
      }
    },
    examples: getAgentDocsPayload()
  };
}
