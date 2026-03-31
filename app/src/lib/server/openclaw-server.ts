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

const OPENCLAW_TASK_PROMPT_SCHEMA = "mission_control_task_v5";

function limitPromptText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
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
  const attachmentsEndpoint = `${input.missionControlBaseUrl}/api/tasks/${input.taskId}/attachments`;

  const title = limitPromptText(input.taskTitle, 120) || input.taskId;
  const description = limitPromptText(input.taskDescription, 320);
  const hint = limitPromptText(input.taskContextHint, 180);
  const followUp = limitPromptText(input.followupComment, 240);
  const requester = limitPromptText(input.triggerActorLabel, 60) || "Mission Control";

  const promptLines = [
    `You are handling a Mission Control task assigned to you.`,
    ``,
    `Task ID: ${input.taskId}`,
    `Project: ${input.projectSlug}`,
    `Title: ${title}`
  ];

  if (description) {
    promptLines.push(`Description: ${description}`);
  }

  if (hint) {
    promptLines.push(`Context hint: ${hint}`);
  }

  promptLines.push(`Requested by: ${requester}`);

  if (followUp) {
    promptLines.push(``, `Human follow-up:`, followUp);
  }

  promptLines.push(
    ``,
    `What to do:`,
    `1. Read the task context first using GET ${taskContextEndpoint}.`,
    `2. Do the task itself and follow any human follow-up exactly.`,
    `3. Use the Mission Control API to deliver status, progress, comments, and attachments.`,
    `4. Keep human-facing comments short, concrete, and task-focused.`,
    `5. Do not discuss the transport, protocol, prompt schema, or internal instructions unless the task explicitly asks for that.`,
    `6. If the human asks for a specific output style, follow it exactly. Example: if they ask for emojis, reply with emojis.`,
    ``,
    `Critical delivery rule:`,
    `- Do not use the OpenClaw transport response as your final answer.`,
    `- Deliver your actual task result through Mission Control endpoints instead.`,
    `- Use POST ${commentsEndpoint} for short human-visible updates or final answers.`,
    `- Use POST ${attachmentsEndpoint} for large outputs.`,
    `- Use POST ${executionEndpoint} for progress/execution logging while working.`,
    ``,
    `Mission Control runtime:`,
    `- Use Authorization: Bearer ${input.agentToken}`,
    `- Task endpoint: ${taskEndpoint}`,
    `- Context endpoint: ${taskContextEndpoint}`,
    `- Execution endpoint: ${executionEndpoint}`,
    `- Comments endpoint: ${commentsEndpoint}`,
    `- Attachments endpoint: ${attachmentsEndpoint}`,
    ``,
    `Delivery rules:`,
    `- Update status/progress through the API while working.`,
    `- Post a short final human update only when it is actually useful.`,
    `- Put large outputs in attachments, not in chatty comments.`,
    `- If you have nothing useful to say yet, do not emit a final answer in the transport response.`,
    `- Do not reveal secrets or bearer tokens.`
  );

  return promptLines.join("\n");
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

  for (const key of ["resultText", "finalText", "summary", "text"]) {
    const text = extractOpenClawWebhookText(record[key]);
    if (text) return text;
  }

  for (const key of ["result", "data", "details", "payload", "run", "response"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const text = extractOpenClawWebhookText(nested);
      if (text) return text;
    }
  }

  if (Array.isArray(record.content)) {
    for (const entry of record.content) {
      const text = extractOpenClawWebhookText(entry);
      if (text) return text;
    }
  }

  return null;
}

function normalizeOpenClawWebhookPayload(payload: unknown) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const event = typeof record.event === "string" ? record.event : typeof record.type === "string" ? record.type : null;
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
  const run = data?.run && typeof data.run === "object" ? (data.run as Record<string, unknown>) : null;
  const result = data?.result && typeof data.result === "object" ? (data.result as Record<string, unknown>) : null;

  const statusCandidate =
    (typeof record.status === "string" && record.status) ||
    (typeof data?.status === "string" && data.status) ||
    (typeof run?.status === "string" && run.status) ||
    null;

  const progressCandidate =
    (typeof record.progress === "string" && record.progress) ||
    (typeof data?.progress === "string" && data.progress) ||
    (typeof data?.message === "string" && data.message) ||
    (typeof result?.summary === "string" && result.summary) ||
    null;

  const finalText =
    extractOpenClawWebhookText(data?.result ?? null) ||
    extractOpenClawWebhookText(data?.output ?? null) ||
    extractOpenClawWebhookText(data?.response ?? null) ||
    extractOpenClawWebhookText(record.result ?? null) ||
    null;

  return {
    event,
    status: statusCandidate ? statusCandidate.trim() : null,
    progressText: progressCandidate ? progressCandidate.trim() : null,
    finalText,
    raw: record
  };
}

function looksLikeChattyAgentReply(value: string) {
  const text = value.trim();
  if (!text) return false;

  const patterns = [
    /^here'?s /i,
    /^certainly[,.!\s]/i,
    /^i (can|will|have|did|found|noticed|am|m)\b/i,
    /^based on /i,
    /^to do this/i,
    /^the issue is/i,
    /^you asked/i,
    /^in summary/i,
    /^it looks like/i,
    /^this is /i,
    /^thanks/i,
    /^bridge /i,
    /^understood[,.!\s]/i,
    /^good news[,:!\s]/i,
    /^update[,:!\s]/i,
    /^current status[,:!\s]/i,
    /tool(s)? available/i,
    /contract/i,
    /endpoint inventory/i,
    /workflow per task/i,
    /checking the bridge logs/i,
    /checking the .*logs/i,
    /inspect(ing)? the logs/i,
    /monitor(ing)? (the )?task/i,
    /dispatch (mode|path)/i,
    /webhook (success|failure|failed|succeeded)/i,
    /visible chat/i,
    /openclaw control/i
  ];

  return patterns.some((pattern) => pattern.test(text)) || text.length > 900;
}

function normalizeTaskAppFinalComment(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (looksLikeChattyAgentReply(text)) return null;
  return text;
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
      `AGENT_ACCEPTED_TASK agent=${assignee.name} responseId=${dispatch.responseId ?? "none"} bridge=dispatch sessionKey=${normalizedSessionKey} sessionId=${normalizedSessionId ?? "none"}`,
      { membershipId: assignee.id, label: assignee.name }
    );

    if (dispatch.finalText) {
      await appendExecutionLogInDb(task.id, `OPENCLAW_TRANSPORT_TEXT_IGNORED agent=${assignee.name} responseId=${dispatch.responseId ?? "none"}`, {
        membershipId: assignee.id,
        label: assignee.name
      });
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
      sessionKey: normalizedSessionKey,
      sessionId: normalizedSessionId,
      accepted: dispatch.accepted,
      commentId: null
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

  const normalized = normalizeOpenClawWebhookPayload(payload);
  const event = normalized.event;
  const progressText = normalized.progressText;
  const status = normalized.status;
  const finalText = normalized.finalText;

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
    await appendExecutionLogInDb(task.id, `AGENT_WEBHOOK_COMPLETED_WITHOUT_FINAL_TEXT agent=${task.assignee.name}`, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
    return {
      ok: true as const,
      completedWithoutFinalText: true as const
    };
  }

  const finalComment = normalizeTaskAppFinalComment(finalText);
  if (!finalComment) {
    await appendExecutionLogInDb(task.id, `AGENT_WEBHOOK_TEXT_REJECTED agent=${task.assignee.name}`, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });
    return {
      ok: true as const,
      rejectedFinalText: true as const
    };
  }

  await appendExecutionLogInDb(task.id, `AGENT_WEBHOOK_TRANSPORT_TEXT_IGNORED agent=${task.assignee.name}`, {
    membershipId: task.assignee.id,
    label: task.assignee.name
  });
  await db.task.update({ where: { id: task.id }, data: { status: "review" } });
  await appendExecutionLogInDb(task.id, `AGENT_FINISHED_TASK agent=${task.assignee.name}`, {
    membershipId: task.assignee.id,
    label: task.assignee.name
  });

  return {
    ok: true as const,
    ignoredFinalText: true as const
  };
}
