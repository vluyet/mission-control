import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createAgentAccessToken, getOwnerAuthConfig, hashAgentAccessToken } from "@/lib/auth";
import { DEFAULT_WORKSPACE_SLUG, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/workspace-session";
import { dispatchOpenClawTaskRun, fetchOpenClawAgents } from "@/lib/openclaw";
import { appendExecutionLogInDb, createCommentInDb } from "@/lib/server-data";

async function getActiveWorkspaceSlug() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value || DEFAULT_WORKSPACE_SLUG;
}

async function getActiveWorkspaceRecord() {
  const activeSlug = await getActiveWorkspaceSlug();

  const workspace =
    (await db.workspace.findFirst({ where: { slug: activeSlug } })) ??
    (await db.workspace.findFirst({ where: { slug: DEFAULT_WORKSPACE_SLUG } })) ??
    (await db.workspace.findFirst({ orderBy: { createdAt: "asc" } }));

  return workspace;
}

async function createOpenClawRuntimeCredential(membershipId: string, taskId: string) {
  const token = await createAgentAccessToken();
  const tokenHash = await hashAgentAccessToken(token);
  const credential = await db.agentCredential.create({
    data: {
      membershipId,
      name: `runtime-${taskId}-${Date.now()}`,
      tokenHash,
      scopes: ["tasks.read", "comments.write", "execution.write"]
    }
  });

  return {
    id: credential.id,
    token
  };
}

function buildOpenClawTaskMessage(input: {
  taskId: string;
  projectSlug: string;
  taskTitle: string;
  taskDescription: string;
  taskContextHint: string;
  missionControlBaseUrl: string;
  agentToken: string;
}) {
  return [
    `You are handling Mission Control task ${input.taskId} in project ${input.projectSlug}.`,
    `Task title: ${input.taskTitle}`,
    input.taskDescription ? `Task description: ${input.taskDescription}` : "Task description: (none provided)",
    input.taskContextHint ? `Task context hint: ${input.taskContextHint}` : "Task context hint: (none provided)",
    "",
    "Use Mission Control APIs to report progress and final output:",
    `Mission Control base URL: ${input.missionControlBaseUrl}`,
    `Bearer token: ${input.agentToken}`,
    `Execution endpoint: ${input.missionControlBaseUrl}/api/tasks/${input.taskId}/execution`,
    `Comments endpoint: ${input.missionControlBaseUrl}/api/tasks/${input.taskId}/comments`,
    "",
    "Required actions:",
    "1) POST progress lines to /execution as you work.",
    "2) POST your final user-facing answer to /comments.",
    "",
    "Never reveal the bearer token in comments or execution logs."
  ].join("\n");
}

function extractOpenClawWebhookText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = extractOpenClawWebhookText(entry);
      if (text) return text;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["response", "message", "output", "output_text", "text", "finalText", "resultText", "summary"]) {
    const text = extractOpenClawWebhookText(record[key]);
    if (text) return text;
  }

  for (const key of ["result", "data", "details", "response"]) {
    const text = extractOpenClawWebhookText(record[key]);
    if (text) return text;
  }

  if (Array.isArray(record.content)) {
    for (const entry of record.content) {
      if (entry && typeof entry === "object") {
        const text = extractOpenClawWebhookText((entry as Record<string, unknown>).text);
        if (text) return text;
      }
    }
  }

  return null;
}

export async function syncActiveWorkspaceOpenClawAgentsInDb() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  if (!integration || !integration.enabled) {
    return { error: "OPENCLAW_NOT_CONFIGURED" } as const;
  }

  try {
    const agents = await fetchOpenClawAgents({
      baseUrl: integration.baseUrl,
      gatewayToken: integration.gatewayToken
    });

    const existing = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        sourceSystem: "openclaw"
      }
    });

    const seen = new Set<string>();

    for (const agent of agents) {
      seen.add(agent.id);
      await db.membership.upsert({
        where: {
          workspaceId_sourceSystem_sourceKey: {
            workspaceId: activeWorkspace.id,
            sourceSystem: "openclaw",
            sourceKey: agent.id
          }
        },
        update: {
          name: agent.name,
          capabilities: agent.capabilities,
          enabled: true,
          agentPermissions: ["task.transitions", "task.comments", "task.execution"]
        },
        create: {
          workspaceId: activeWorkspace.id,
          name: agent.name,
          kind: "agent",
          sourceSystem: "openclaw",
          sourceKey: agent.id,
          capabilities: agent.capabilities,
          enabled: true,
          agentPermissions: ["task.transitions", "task.comments", "task.execution"]
        }
      });
    }

    for (const member of existing.filter((item) => item.sourceKey && !seen.has(item.sourceKey))) {
      await db.membership.update({ where: { id: member.id }, data: { enabled: false } });
    }

    const activeOpenClawMemberships = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        kind: "agent",
        sourceSystem: "openclaw",
        enabled: true
      },
      select: { id: true }
    });

    const workspaceProjects = await db.project.findMany({
      where: { workspaceId: activeWorkspace.id },
      select: { id: true }
    });

    for (const project of workspaceProjects) {
      const existingProjectMemberships = await db.projectMembership.findMany({
        where: { projectId: project.id },
        select: { membershipId: true }
      });
      const existingIds = new Set(existingProjectMemberships.map((entry) => entry.membershipId));
      const missingAgentIds = activeOpenClawMemberships.map((membership) => membership.id).filter((membershipId) => !existingIds.has(membershipId));

      if (missingAgentIds.length) {
        await db.projectMembership.createMany({
          data: missingAgentIds.map((membershipId) => ({
            projectId: project.id,
            membershipId,
            role: "member" as const
          })),
          skipDuplicates: true
        });
      }
    }

    const updatedIntegration = await db.workspaceOpenClawIntegration.update({
      where: { workspaceId: activeWorkspace.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null
      }
    });

    await db.authEvent.create({
      data: {
        workspaceId: activeWorkspace.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.sync_succeeded",
        detail: `Synced ${agents.length} OpenClaw agent${agents.length === 1 ? "" : "s"}`
      }
    });

    return {
      integration: {
        id: updatedIntegration.id,
        label: updatedIntegration.label ?? "",
        baseUrl: updatedIntegration.baseUrl,
        enabled: updatedIntegration.enabled,
        tokenConfigured: true,
        lastSyncAt: updatedIntegration.lastSyncAt ? updatedIntegration.lastSyncAt.toISOString() : null,
        lastSyncStatus: updatedIntegration.lastSyncStatus ?? null,
        lastSyncError: updatedIntegration.lastSyncError ?? null
      },
      agents
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenClaw sync failed.";

    const updatedIntegration = await db.workspaceOpenClawIntegration.update({
      where: { workspaceId: activeWorkspace.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "error",
        lastSyncError: message
      }
    });

    await db.authEvent.create({
      data: {
        workspaceId: activeWorkspace.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.sync_failed",
        detail: message
      }
    });

    return {
      error: "OPENCLAW_SYNC_FAILED",
      message,
      integration: updatedIntegration
    } as const;
  }
}

export async function dispatchTaskToOpenClawInDb(taskId: string, options?: { missionControlBaseUrl?: string | null }) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { workspace: true } },
      assignee: true
    }
  });

  if (!task) {
    return null;
  }

  if (!task.assignee || task.assignee.kind !== "agent" || task.assignee.sourceSystem !== "openclaw" || !task.assignee.sourceKey) {
    return { error: "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" } as const;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: task.project.workspaceId }
  });

  if (!integration || !integration.enabled) {
    return { error: "OPENCLAW_NOT_CONFIGURED" } as const;
  }

  const runtimeCredential = await createOpenClawRuntimeCredential(task.assignee.id, task.id);
  const missionControlBaseUrl = options?.missionControlBaseUrl?.replace(/\/+$/, "") || "http://127.0.0.1:3001";

  const message = buildOpenClawTaskMessage({
    taskId: task.id,
    projectSlug: task.project.slug,
    taskTitle: task.title,
    taskDescription: task.description ?? "",
    taskContextHint: task.contextHint ?? "",
    missionControlBaseUrl,
    agentToken: runtimeCredential.token
  });

  try {
    const dispatch = await dispatchOpenClawTaskRun({
      baseUrl: integration.baseUrl,
      gatewayToken: integration.gatewayToken,
      hookToken: process.env.OPENCLAW_HOOKS_TOKEN?.trim() || integration.gatewayToken,
      agentId: task.assignee.sourceKey,
      taskId: task.id,
      workspaceId: task.project.workspaceId,
      message
    });

    await appendExecutionLogInDb(task.id, `Dispatched to OpenClaw agent ${task.assignee.name}.`, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
    await appendExecutionLogInDb(task.id, `OpenClaw accepted dispatch for ${task.assignee.name}.`, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
    await appendExecutionLogInDb(
      task.id,
      `OpenClaw dispatch response: responseId=${dispatch.responseId ?? "none"}; payload=${JSON.stringify(dispatch.raw).slice(0, 800)}`,
      { membershipId: task.assignee.id, label: task.assignee.name }
    );

    let commentId: string | null = null;
    if (dispatch.finalText) {
      const comment = await createCommentInDb(task.id, {
        author: task.assignee.name,
        role: "Agent",
        tone: "agent",
        body: dispatch.finalText,
        membershipId: task.assignee.id
      });

      if (comment && "error" in comment) {
        return { error: "OPENCLAW_COMMENT_WRITE_FAILED", message: "OpenClaw returned a response, but Mission Control could not post it as an agent comment." } as const;
      }

      if (comment && !("error" in comment)) {
        commentId = comment.id;
        await appendExecutionLogInDb(task.id, `OpenClaw returned a final response for ${task.assignee.name}.`, {
          membershipId: task.assignee.id,
          label: task.assignee.name
        });
      }
    }

    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: task.assignee.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.task_dispatched",
        detail: `Dispatched task ${task.id} to ${task.assignee.name}`
      }
    });

    return {
      taskId: task.id,
      agentId: task.assignee.id,
      openclawAgentId: task.assignee.sourceKey,
      responseId: dispatch.responseId,
      accepted: dispatch.accepted,
      commentId
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenClaw task dispatch failed.";
    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: task.assignee.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.task_dispatch_failed",
        detail: message
      }
    });
    return { error: "OPENCLAW_DISPATCH_FAILED", message } as const;
  }
}

export async function handleOpenClawTaskWebhookInDb(taskId: string, payload: unknown) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignee: true
    }
  });

  if (!task) {
    return { error: "TASK_NOT_FOUND" } as const;
  }

  if (!task.assignee || task.assignee.kind !== "agent" || task.assignee.sourceSystem !== "openclaw") {
    return { error: "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" } as const;
  }

  const finalText = extractOpenClawWebhookText(payload);
  if (!finalText) {
    return { error: "NO_FINAL_TEXT" } as const;
  }

  const comment = await createCommentInDb(task.id, {
    author: task.assignee.name,
    role: "Agent",
    tone: "agent",
    body: finalText,
    membershipId: task.assignee.id
  });

  if (comment && "error" in comment) {
    return { error: "OPENCLAW_COMMENT_WRITE_FAILED" } as const;
  }

  await appendExecutionLogInDb(task.id, `OpenClaw webhook returned a final response for ${task.assignee.name}.`, {
    membershipId: task.assignee.id,
    label: task.assignee.name
  });

  return {
    ok: true as const,
    commentId: comment && !("error" in comment) ? comment.id : null
  };
}
