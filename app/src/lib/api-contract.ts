import { getLocalizedAgentDocsSections, getLocalizedWorkspaceContextBlock } from "@/lib/demo-data";
import type { Messages } from "@/lib/i18n/messages";
import type { Translator } from "@/lib/i18n/translator";

export function apiMeta() {
  return {
    generated_at: new Date().toISOString(),
    mode: "launch-prep",
    version: "2026-03-16"
  };
}

export function getAgentDocsPayload(t: Translator, messages: Messages) {
  return {
    summary:
      t("agentDocsApi.summary"),
    auth: {
      owner: t("agentDocsApi.auth.owner"),
      agent: t("agentDocsApi.auth.agent"),
      notes: [
        t("agentDocsApi.auth.notes.0"),
        t("agentDocsApi.auth.notes.1"),
        t("agentDocsApi.auth.notes.2")
      ]
    },
    principles: getLocalizedAgentDocsSections(messages),
    resources: [
      {
        method: "GET",
        path: "/api/workspaces/default/context",
        purpose: t("agentDocsApi.resources.workspaceContextPurpose")
      },
      {
        method: "GET",
        path: "/api/projects/:slug/context",
        purpose: t("agentDocsApi.resources.projectContextPurpose")
      },
      {
        method: "POST",
        path: "/api/projects",
        purpose: t("agentDocsApi.resources.projectCreatePurpose")
      },
      {
        method: "GET",
        path: "/api/projects/:slug",
        purpose: t("agentDocsApi.resources.projectGovernanceReadPurpose")
      },
      {
        method: "PATCH",
        path: "/api/projects/:slug",
        purpose: t("agentDocsApi.resources.projectGovernanceUpdatePurpose")
      },
      {
        method: "GET",
        path: "/api/projects/:slug/members",
        purpose: t("agentDocsApi.resources.projectMembersReadPurpose")
      },
      {
        method: "PUT",
        path: "/api/projects/:slug/members",
        purpose: t("agentDocsApi.resources.projectMembersUpdatePurpose")
      },
      {
        method: "PATCH",
        path: "/api/members/:memberId",
        purpose: t("agentDocsApi.resources.memberUpdatePurpose")
      },
      {
        method: "GET",
        path: "/api/workspaces/current/constructor",
        purpose: t("agentDocsApi.resources.constructorReadPurpose")
      },
      {
        method: "PATCH",
        path: "/api/workspaces/current/constructor",
        purpose: t("agentDocsApi.resources.constructorUpdatePurpose")
      },
      {
        method: "POST",
        path: "/api/workspaces/current/constructor/sync",
        purpose: t("agentDocsApi.resources.constructorSyncPurpose")
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/dispatch",
        purpose:
          t("agentDocsApi.resources.constructorDispatchPurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/constructor/status",
        purpose: t("agentDocsApi.resources.constructorStatusPurpose")
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/callback",
        purpose: t("agentDocsApi.resources.constructorCallbackPurpose")
      },
      {
        method: "GET",
        path: "/api/workspaces/current/agent-credentials",
        purpose: t("agentDocsApi.resources.agentCredentialsListPurpose")
      },
      {
        method: "POST",
        path: "/api/workspaces/current/agent-credentials",
        purpose: t("agentDocsApi.resources.agentCredentialsCreatePurpose")
      },
      {
        method: "PATCH",
        path: "/api/agent-credentials/:credentialId",
        purpose: t("agentDocsApi.resources.agentCredentialUpdatePurpose")
      },
      {
        method: "GET",
        path: "/api/search?q=:query",
        purpose: t("agentDocsApi.resources.searchPurpose")
      },
      {
        method: "POST",
        path: "/api/projects/:slug/tasks",
        purpose: t("agentDocsApi.resources.taskCreatePurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId",
        purpose: t("agentDocsApi.resources.taskReadPurpose")
      },
      {
        method: "PATCH",
        path: "/api/tasks/:taskId",
        purpose: t("agentDocsApi.resources.taskUpdatePurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/watchers",
        purpose: t("agentDocsApi.resources.taskWatchersReadPurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/attachments",
        purpose: t("agentDocsApi.resources.taskAttachmentsReadPurpose")
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/attachments",
        purpose: t("agentDocsApi.resources.taskAttachmentsCreatePurpose")
      },
      {
        method: "GET",
        path: "/api/attachments/:attachmentId",
        purpose: t("agentDocsApi.resources.attachmentDownloadPurpose")
      },
      {
        method: "GET",
        path: "/api/attachments/:attachmentId/preview",
        purpose: t("agentDocsApi.resources.attachmentPreviewPurpose")
      },
      {
        method: "PUT",
        path: "/api/tasks/:taskId/watchers",
        purpose: t("agentDocsApi.resources.taskWatchersUpdatePurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/context",
        purpose: t("agentDocsApi.resources.taskContextPurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/comments",
        purpose: t("agentDocsApi.resources.taskCommentsReadPurpose")
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/comments",
        purpose: t("agentDocsApi.resources.taskCommentsCreatePurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/activity",
        purpose: t("agentDocsApi.resources.taskActivityPurpose")
      },
      {
        method: "GET",
        path: "/api/tasks/:taskId/execution",
        purpose: t("agentDocsApi.resources.taskExecutionReadPurpose")
      },
      {
        method: "POST",
        path: "/api/tasks/:taskId/execution",
        purpose: t("agentDocsApi.resources.taskExecutionCreatePurpose")
      },
      {
        method: "GET",
        path: "/api/docs/agents",
        purpose: t("agentDocsApi.resources.docsReadPurpose")
      },
      {
        method: "GET",
        path: "/api/docs/agents/contract",
        purpose: t("agentDocsApi.resources.docsContractPurpose")
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
    workspace_context: getLocalizedWorkspaceContextBlock(messages),
    context_resolution: null,
    recent_activity: []
  };
}

export function getAgentContractPayload(t: Translator, messages: Messages) {
  return {
    contract: "mission-control-agent-api",
    version: "2026-03-16",
    description:
      t("agentDocsApi.contract.description"),
    semantics: {
      authentication: {
        owner: t("agentDocsApi.contract.authentication.owner"),
        agent: t("agentDocsApi.contract.authentication.agent"),
        notes: [
          t("agentDocsApi.contract.authentication.notes.0"),
          t("agentDocsApi.contract.authentication.notes.1"),
          t("agentDocsApi.contract.authentication.notes.2")
        ]
      },
      context_resolution: {
        resolution_order: ["workspace", "project", "task"],
        notes: [
          t("agentDocsApi.contract.contextResolution.notes.0"),
          t("agentDocsApi.contract.contextResolution.notes.1"),
          t("agentDocsApi.contract.contextResolution.notes.2")
        ]
      },
      channels: {
        comments: t("agentDocsApi.contract.channels.comments"),
        activity: t("agentDocsApi.contract.channels.activity"),
        execution: t("agentDocsApi.contract.channels.execution")
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
          t("agentDocsApi.contract.notes.projectGovernanceVisibility"),
          t("agentDocsApi.contract.notes.projectGovernanceStatus")
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
          t("agentDocsApi.contract.notes.projectMembersRoles"),
          t("agentDocsApi.contract.notes.projectMembersObserver")
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
          t("agentDocsApi.contract.notes.constructorLinkReadReveal"),
          t("agentDocsApi.contract.notes.constructorLinkKeepApiToken"),
          t("agentDocsApi.contract.notes.constructorLinkKeepCallbackToken"),
          t("agentDocsApi.contract.notes.constructorLinkUnsignedCallbacks")
        ]
      },
      constructor_sync: {
        method: "POST",
        path: "/api/workspaces/current/constructor/sync",
        response_shape: ["integration", "agents[]"],
        notes: [
          t("agentDocsApi.contract.notes.constructorSyncFetchAgents"),
          t("agentDocsApi.contract.notes.constructorSyncSourceSystem")
        ]
      },
      constructor_dispatch: {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/dispatch",
        response_shape: ["dispatch.bridgeExecutionId", "dispatch.externalTaskId", "dispatch.executionState", "dispatch.accepted"],
        notes: [
          t("agentDocsApi.contract.notes.constructorDispatchOwnerOnly"),
          t("agentDocsApi.contract.notes.constructorDispatchAgentSelection"),
          t("agentDocsApi.contract.notes.constructorDispatchSourceOfTruth")
        ]
      },
      constructor_status: {
        method: "GET",
        path: "/api/tasks/:taskId/constructor/status",
        response_shape: ["tracked", "active", "refresh", "summary?"],
        notes: [
          t("agentDocsApi.contract.notes.constructorStatusTrackedExecution"),
          t("agentDocsApi.contract.notes.constructorStatusDedupedLogs")
        ]
      },
      constructor_callback: {
        method: "POST",
        path: "/api/tasks/:taskId/constructor/callback",
        response_shape: ["ok", "commentId?", "duplicate?"],
        notes: [
          t("agentDocsApi.contract.notes.constructorCallbackTerminal"),
          t("agentDocsApi.contract.notes.constructorCallbackDeduped")
        ]
      },
      member_update: {
        method: "PATCH",
        path: "/api/members/:memberId",
        request_shape: ["workspaceRole?", "enabled?", "agentPermissions?"],
        notes: [
          t("agentDocsApi.contract.notes.memberUpdateRoles"),
          t("agentDocsApi.contract.notes.memberUpdateAgentOnly"),
          t("agentDocsApi.contract.notes.memberUpdatePermissions")
        ]
      },
      agent_credentials: {
        method: "POST",
        path: "/api/workspaces/current/agent-credentials",
        request_shape: ["membershipId", "name", "scopes[]"],
        notes: [
          t("agentDocsApi.contract.notes.agentCredentialsReturnsTokenOnce"),
          t("agentDocsApi.contract.notes.agentCredentialsOwnerOnly")
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
        notes: [t("agentDocsApi.contract.notes.searchScope")]
      },
      task_create: {
        method: "POST",
        path: "/api/projects/:slug/tasks",
        request_shape: ["title", "description?", "status?", "priority?", "assigneeId?", "parentTaskId?", "tags[]?", "startDate?", "dueDate?"],
        notes: [
          t("agentDocsApi.contract.notes.taskCreateAssignees"),
          t("agentDocsApi.contract.notes.taskCreateViewerObserver"),
          t("agentDocsApi.contract.notes.taskCreateParentProject")
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
          t("agentDocsApi.contract.notes.taskAttachmentCreateActorTypes"),
          t("agentDocsApi.contract.notes.taskAttachmentCreateEnabledAgent"),
          t("agentDocsApi.contract.notes.taskAttachmentCreateOutputs")
        ]
      },
      attachment_preview: {
        method: "GET",
        path: "/api/attachments/:attachmentId/preview",
        response_shape: ["binary inline response"],
        notes: [t("agentDocsApi.contract.notes.attachmentPreviewSupported")]
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
          t("agentDocsApi.contract.notes.taskUpdateDisabledAgents"),
          t("agentDocsApi.contract.notes.taskUpdateViewerRole"),
          t("agentDocsApi.contract.notes.taskUpdateObserverRole"),
          t("agentDocsApi.contract.notes.taskUpdateTransitionPolicies"),
          t("agentDocsApi.contract.notes.taskUpdateAgentStatusModel"),
          t("agentDocsApi.contract.notes.taskUpdateAgentPermission"),
          t("agentDocsApi.contract.notes.taskUpdateDoneSummary")
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
        notes: [t("agentDocsApi.contract.notes.taskWatchersUpdateMeaning")]
      },
      task_attachment_upload: {
        method: "POST",
        path: "/api/tasks/:taskId/attachments",
        request_shape: ["multipart:file", "artifactType?", "actorType?", "actorName?"],
        notes: [
          t("agentDocsApi.contract.notes.taskAttachmentUploadStorage"),
          t("agentDocsApi.contract.notes.taskAttachmentUploadEnabledAgent")
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
          t("agentDocsApi.contract.notes.taskCommentCreatePermission"),
          t("agentDocsApi.contract.notes.taskCommentCreateMentions")
        ]
      },
      task_comment_update: {
        method: "PATCH",
        path: "/api/tasks/:taskId/comments/:commentId",
        request_shape: ["body"],
        notes: [t("agentDocsApi.contract.notes.taskCommentUpdateHumanOnly")]
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
        notes: [t("agentDocsApi.contract.notes.taskExecutionAppendPermission")]
      }
    },
    examples: getAgentDocsPayload(t, messages)
  };
}
