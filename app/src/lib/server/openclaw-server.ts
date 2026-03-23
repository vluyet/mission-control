import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createAgentAccessToken, getOwnerAuthConfig, hashAgentAccessToken } from "@/lib/auth";
import { DEFAULT_WORKSPACE_SLUG, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/workspace-session";
import { dispatchOpenClawTaskRun, fetchOpenClawAgents } from "@/lib/openclaw";
import { appendExecutionLogInDb, createCommentInDb } from "@/lib/server-data";

type OpenClawDispatchOptions = {
  missionControlBaseUrl?: string | null;
  overrideAssigneeId?: string | null;
  triggerCommentBody?: string | null;
  triggerActorLabel?: string | null;
  sessionKey?: string | null;
  sessionId?: string | null;
};

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
      scopes: ["tasks.read", "tasks.write", "comments.write", "execution.write"]
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
  followupComment: string;
  triggerActorLabel: string;
  missionControlBaseUrl: string;
  agentToken: string;
}) {
  const taskEndpoint = `${input.missionControlBaseUrl}/api/tasks/${input.taskId}`;
  const taskContextEndpoint = `${taskEndpoint}/context`;
  const executionEndpoint = `${input.missionControlBaseUrl}/api/tasks/${input.taskId}/execution`;
  const commentsEndpoint = `${input.missionControlBaseUrl}/api/tasks/${input.taskId}/comments`;
  const taskTitle = input.taskTitle.trim().slice(0, 160);
  const taskDescription = input.taskDescription.trim().slice(0, 900);
  const taskContextHint = input.taskContextHint.trim().slice(0, 500);
  const followupComment = input.followupComment.trim().slice(0, 700);

  return [
    `Mission Control task ${input.taskId} in project ${input.projectSlug}.`,
    `Title: ${taskTitle}`,
    taskDescription ? `Description: ${taskDescription}` : "Description: (none)",
    taskContextHint ? `Task hint: ${taskContextHint}` : "Task hint: (none)",
    followupComment ? `Follow-up request from ${input.triggerActorLabel}: ${followupComment}` : "",
    "",
    "Mission Control API access:",
    `Base URL: ${input.missionControlBaseUrl}`,
    `Bearer token: ${input.agentToken}`,
    `Task context endpoint: ${taskContextEndpoint}`,
    `Task endpoint: ${taskEndpoint}`,
    `Execution endpoint: ${executionEndpoint}`,
    `Comments endpoint: ${commentsEndpoint}`,
    "",
    "Required workflow:",
    "0) First GET the task context endpoint. Respect context precedence: task > project > workspace.",
    "1) Immediately POST execution endpoint with this exact line: AGENT_CONTEXT_RETRIEVED.",
    "2) Keep task status in_progress while working.",
    "3) If blocked, PATCH task endpoint with {\"status\":\"blocked\",\"blockedReason\":\"...\"} and POST execution line: AGENT_BLOCKED: <reason>.",
    "4) When finished, POST final user-facing answer to comments endpoint.",
    "5) Then POST execution endpoint with this exact line: AGENT_FINISHED_TASK.",
    "6) Then PATCH task endpoint with {\"status\":\"review\"}.",
    "Do not post periodic milestone logs.",
    "",
    "Never reveal the bearer token in comments or execution logs."
  ].join("\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTaskAgentSessionKey(taskId: string, openclawAgentId: string) {
  const safeAgentId = openclawAgentId.replace(/[^a-zA-Z0-9_.:-]+/g, "-");
  return `hook:mission-control:task:${taskId}:agent:${safeAgentId}`;
}

function findMentionIndex(body: string, candidate: string) {
  const escaped = escapeRegExp(candidate.trim());
  if (!escaped) {
    return -1;
  }

  const mentionPattern = new RegExp(`(^|\\s)@${escaped}(?=$|\\s|[.,!?;:()\\[\\]{}])`, "i");
  const match = mentionPattern.exec(body);
  return match?.index ?? -1;
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

export async function dispatchTaskToOpenClawInDb(taskId: string, options?: OpenClawDispatchOptions) {
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

  const requestedAssignee = options?.overrideAssigneeId
    ? await db.membership.findFirst({
        where: {
          id: options.overrideAssigneeId,
          workspaceId: task.project.workspaceId,
          kind: "agent",
          enabled: true,
          sourceSystem: "openclaw"
        }
      })
    : null;
  const assignee = requestedAssignee ?? task.assignee;

  if (!assignee || assignee.kind !== "agent" || assignee.sourceSystem !== "openclaw" || !assignee.sourceKey) {
    return { error: "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" } as const;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: task.project.workspaceId }
  });

  if (!integration || !integration.enabled) {
    return { error: "OPENCLAW_NOT_CONFIGURED" } as const;
  }

  const runtimeCredential = await createOpenClawRuntimeCredential(assignee.id, task.id);
  const missionControlBaseUrl = options?.missionControlBaseUrl?.replace(/\/+$/, "") || "http://127.0.0.1:3001";
  const normalizedSessionKey = options?.sessionKey?.trim() || buildTaskAgentSessionKey(task.id, assignee.sourceKey);
  const normalizedSessionId = options?.sessionId?.trim() || null;

  const message = buildOpenClawTaskMessage({
    taskId: task.id,
    projectSlug: task.project.slug,
    taskTitle: task.title,
    taskDescription: task.description ?? "",
    taskContextHint: task.contextHint ?? "",
    followupComment: options?.triggerCommentBody ?? "",
    triggerActorLabel: options?.triggerActorLabel?.trim() || "Workspace Owner",
    missionControlBaseUrl,
    agentToken: runtimeCredential.token
  });

  try {
    const webhookToken = process.env.OPENCLAW_WEBHOOK_TOKEN?.trim() || process.env.MISSION_CONTROL_OPENCLAW_WEBHOOK_TOKEN?.trim() || undefined;
    const dispatch = await dispatchOpenClawTaskRun({
      baseUrl: integration.baseUrl,
      gatewayToken: integration.gatewayToken,
      hookToken: process.env.OPENCLAW_HOOKS_TOKEN?.trim() || integration.gatewayToken,
      agentId: assignee.sourceKey,
      taskId: task.id,
      workspaceId: task.project.workspaceId,
      message,
      sessionKey: normalizedSessionKey,
      sessionId: normalizedSessionId,
      webhookUrl: `${missionControlBaseUrl}/api/tasks/${task.id}/openclaw/webhook`,
      webhookToken
    });

    await db.task.update({
      where: { id: task.id },
      data: {
        assigneeId: assignee.id,
        status: "in_progress",
        blockedReason: null
      }
    });
    await appendExecutionLogInDb(task.id, `TASK_DISPATCHED agent=${assignee.name}`, {
      membershipId: assignee.id,
      label: assignee.name
    });
    await appendExecutionLogInDb(
      task.id,
      `AGENT_ACCEPTED_TASK agent=${assignee.name} responseId=${dispatch.responseId ?? "none"} sessionKey=${dispatch.sessionKey ?? normalizedSessionKey} sessionId=${dispatch.sessionId ?? "none"}`,
      { membershipId: assignee.id, label: assignee.name }
    );

    let commentId: string | null = null;
    if (dispatch.finalText) {
      const comment = await createCommentInDb(task.id, {
        author: assignee.name,
        role: "Agent",
        tone: "agent",
        body: dispatch.finalText,
        membershipId: assignee.id
      });

      if (comment && "error" in comment) {
        return { error: "OPENCLAW_COMMENT_WRITE_FAILED", message: "OpenClaw returned a response, but Mission Control could not post it as an agent comment." } as const;
      }

      if (comment && !("error" in comment)) {
        commentId = comment.id;
        await db.task.update({ where: { id: task.id }, data: { status: "review", blockedReason: null } });
        const latestExecution = await db.taskExecution.findFirst({
          where: { taskId: task.id },
          orderBy: { createdAt: "desc" }
        });
        if (latestExecution) {
          await db.taskExecution.update({
            where: { id: latestExecution.id },
            data: { status: "done", summary: `Completed by OpenClaw sync response for ${assignee.name}.` }
          });
        }
        await appendExecutionLogInDb(task.id, `AGENT_FINISHED_TASK agent=${assignee.name}`, {
          membershipId: assignee.id,
          label: assignee.name
        });
      }
    }

    const eventType = options?.triggerCommentBody ? "openclaw.task_redispatched_from_comment" : "openclaw.task_dispatched";
    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: assignee.id,
        actorType: "owner",
        actorLabel: options?.triggerActorLabel?.trim() || getOwnerAuthConfig().email,
        eventType,
        detail: `Dispatched task ${task.id} to ${assignee.name}`
      }
    });

    return {
      taskId: task.id,
      projectSlug: task.project.slug,
      agentId: assignee.id,
      openclawAgentId: assignee.sourceKey,
      responseId: dispatch.responseId,
      sessionKey: dispatch.sessionKey ?? normalizedSessionKey,
      sessionId: dispatch.sessionId,
      accepted: dispatch.accepted,
      commentId
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenClaw task dispatch failed.";
    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: assignee.id,
        actorType: "owner",
        actorLabel: options?.triggerActorLabel?.trim() || getOwnerAuthConfig().email,
        eventType: "openclaw.task_dispatch_failed",
        detail: message
      }
    });
    return { error: "OPENCLAW_DISPATCH_FAILED", message } as const;
  }
}

export async function triggerOpenClawMentionDispatchInDb(
  taskId: string,
  input: {
    commentBody: string;
    actorLabel?: string | null;
    missionControlBaseUrl?: string | null;
  }
) {
  const body = input.commentBody.trim();
  if (!body.includes("@")) {
    return { triggered: false as const };
  }

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

  const openclawAgents = await db.membership.findMany({
    where: {
      workspaceId: task.project.workspaceId,
      kind: "agent",
      sourceSystem: "openclaw",
      enabled: true
    }
  });

  const mentionMatches = openclawAgents
    .map((agent) => {
      const options = [agent.name, agent.sourceKey ?? ""]
        .map((value) => value.trim())
        .filter(Boolean);
      const hitIndex = Math.min(
        ...options
          .map((option) => findMentionIndex(body, option))
          .filter((index) => index >= 0)
      );
      return {
        agent,
        hitIndex: Number.isFinite(hitIndex) ? hitIndex : -1
      };
    })
    .filter((entry) => entry.hitIndex >= 0)
    .sort((a, b) => a.hitIndex - b.hitIndex);

  const firstMatch = mentionMatches[0]?.agent;
  if (!firstMatch || !firstMatch.sourceKey) {
    return { triggered: false as const };
  }

  const dispatchResult = await dispatchTaskToOpenClawInDb(taskId, {
    missionControlBaseUrl: input.missionControlBaseUrl,
    overrideAssigneeId: firstMatch.id,
    triggerCommentBody: body,
    triggerActorLabel: input.actorLabel,
    sessionKey: buildTaskAgentSessionKey(taskId, firstMatch.sourceKey)
  });

  if (!dispatchResult) {
    return { error: "TASK_NOT_FOUND" } as const;
  }

  if ("error" in dispatchResult) {
    return dispatchResult;
  }

  await appendExecutionLogInDb(
    taskId,
    `Mention-triggered redispatch by ${input.actorLabel?.trim() || "Workspace Owner"} to ${firstMatch.name}.`,
    {
      membershipId: firstMatch.id,
      label: firstMatch.name
    }
  );

  return {
    triggered: true as const,
    mentionedAgent: {
      id: firstMatch.id,
      name: firstMatch.name,
      sourceKey: firstMatch.sourceKey
    },
    dispatch: dispatchResult
  };
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

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const event = typeof record.event === "string" ? record.event : null;
  const progressText = typeof record.progress === "string" ? record.progress.trim() : null;
  const status = typeof record.status === "string" ? record.status.trim() : null;
  const finalText = extractOpenClawWebhookText(payload);

  if (status === "in_progress") {
    await db.task.update({ where: { id: task.id }, data: { status: "in_progress", blockedReason: null } });
  }

  if (status === "blocked" || event === "blocked") {
    await db.task.update({
      where: { id: task.id },
      data: { status: "blocked", blockedReason: progressText || "OpenClaw reported the task as blocked." }
    });
  }

  if (progressText) {
    await appendExecutionLogInDb(task.id, progressText, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
  }

  if (event === "progress" || event === "blocked") {
    return {
      ok: true as const,
      progress: true as const
    };
  }

  if (event === "failed") {
    await appendExecutionLogInDb(task.id, `OpenClaw reported failure for ${task.assignee.name}.${progressText ? ` ${progressText}` : ""}`.trim(), {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
    return {
      ok: true as const,
      failed: true as const
    };
  }

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

  await db.task.update({ where: { id: task.id }, data: { status: "review" } });
  await appendExecutionLogInDb(task.id, `AGENT_FINISHED_TASK agent=${task.assignee.name}`, {
    membershipId: task.assignee.id,
    label: task.assignee.name
  });

  return {
    ok: true as const,
    commentId: comment && !("error" in comment) ? comment.id : null
  };
}
