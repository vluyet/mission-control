import { revalidatePath } from "next/cache";
import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { dispatchConstructorTask } from "@/lib/constructor";
import { db } from "@/lib/db";
import {
  appendSystemExecutionLogInDb,
  getActiveWorkspaceConstructorIntegrationRecord,
  getTaskResourceFromDb
} from "@/lib/server-data";
import { getApiT } from "@/lib/api-i18n";

type ConstructorConfig =
  | { error: "CONSTRUCTOR_DISABLED" }
  | { baseUrl: string; apiToken: string | null };

type ConstructorAgentCandidate = {
  name: string;
  kind: string;
  enabled: boolean;
  sourceSystem: string | null;
  sourceKey: string | null;
};

type ResolvedTargetAgent =
  | null
  | { error: "CONSTRUCTOR_TARGET_AGENT_REQUIRED"; projectSlug: string }
  | {
      projectSlug: string;
      targetAgent: string;
      targetAgentLabel: string;
      targetSource: "assignee" | "default";
    };

type TaskDispatchReadiness =
  | { ok: true }
  | {
      ok: false;
      code: "CONSTRUCTOR_TASK_UNDERSPECIFIED";
      message: string;
    };

export type ConstructorDispatchOptions = {
  requestUrl: string;
  taskId: string;
  instruction?: string;
  metadata?: Record<string, unknown>;
  routingHints?: Record<string, unknown>;
  sessionId?: string | null;
  externalTaskId?: string | null;
  idempotencyKey?: string | null;
};

async function getConstructorConfig(): Promise<ConstructorConfig> {
  const integration = await getActiveWorkspaceConstructorIntegrationRecord();

  if (integration?.enabled === false) {
    return { error: "CONSTRUCTOR_DISABLED" };
  }

  return {
    baseUrl: integration?.baseUrl?.trim() || process.env.CONSTRUCTOR_BASE_URL?.trim() || "http://127.0.0.1:8787",
    apiToken: integration?.apiToken?.trim() || process.env.CONSTRUCTOR_API_TOKEN?.trim() || null
  };
}

function getMissionControlBaseUrl(requestUrl: URL) {
  const configured = process.env.MISSION_CONTROL_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = requestUrl.hostname === "0.0.0.0" ? "127.0.0.1" : requestUrl.hostname;
  const port = requestUrl.port ? `:${requestUrl.port}` : "";
  return `${requestUrl.protocol}//${host}${port}`;
}

function normalizeTaskText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function contextLayerHasContent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    [record.title, record.summary, record.hint].some((entry) => typeof entry === "string" && entry.trim().length > 0) ||
    (Array.isArray(record.bullets) &&
      record.bullets.some((entry) => typeof entry === "string" && entry.trim().length > 0))
  );
}

function formatBulletSection(title: string, lines: Array<string | null | undefined>) {
  const filtered = lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line));

  if (!filtered.length) {
    return null;
  }

  return `${title}:\n${filtered.map((line) => `- ${line}`).join("\n")}`;
}

function formatContextLayer(title: string, value: unknown, t: Awaited<ReturnType<typeof getApiT>>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bullets = Array.isArray(record.bullets)
    ? record.bullets.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 4)
    : [];
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const layerTitle = typeof record.title === "string" ? record.title.trim() : "";

  return formatBulletSection(title, [
    layerTitle && layerTitle !== title ? t("constructorDispatch.contextTitleLabel", { value: layerTitle }) : null,
    summary ? t("constructorDispatch.contextSummaryLabel", { value: summary }) : null,
    ...bullets
  ]);
}

function formatCompactEffectiveContext(value: unknown, t: Awaited<ReturnType<typeof getApiT>>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const summary = Array.isArray(record.summary)
    ? record.summary.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 2)
    : [];
  const bullets = Array.isArray(record.bullets)
    ? record.bullets.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 6)
    : [];
  const principles = Array.isArray(record.principles)
    ? record.principles.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 4)
    : [];
  const constraints = Array.isArray(record.constraints)
    ? record.constraints.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 4)
    : [];
  const taskHint = typeof record.taskHint === "string" && record.taskHint.trim() ? record.taskHint.trim() : null;

  return formatBulletSection(t("constructorDispatch.effectiveContext"), [
    ...summary,
    ...bullets,
    ...principles.map((value) => t("constructorDispatch.principleLabel", { value })),
    ...constraints.map((value) => t("constructorDispatch.constraintLabel", { value })),
    taskHint ? t("constructorDispatch.taskHintLabel", { value: taskHint }) : null
  ]);
}

function buildMissionControlContext(taskResource: NonNullable<Awaited<ReturnType<typeof getTaskResourceFromDb>>>) {
  const task = taskResource.task;

  return {
    taskId: task.id,
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    reviewer: task.reviewer ?? null,
    project: task.project,
    projectSlug: task.projectSlug,
    tags: task.tags ?? [],
    blockedReason: task.blockedReason ?? null,
    startDate: task.startDate,
    due: task.due,
    contextHint: task.contextHint ?? null,
    parentTask: task.parentTaskId
      ? {
          id: task.parentTaskId,
          title: task.parentTaskTitle ?? null
        }
      : null,
    childTasks: (taskResource.child_tasks ?? []).map((child) => ({
      id: child.id,
      title: child.title,
      status: child.status
    })),
    recentComments: (taskResource.comments ?? [])
      .slice(0, 8)
      .reverse()
      .map((comment) => ({
        author: comment.author,
        role: comment.role,
        body: comment.body
      })),
    attachments: (taskResource.attachments ?? []).slice(0, 8).map((attachment) => ({
      name: attachment.name,
      artifactType: attachment.artifactType,
      uploadedAt: attachment.uploadedAt,
      author: attachment.author
    })),
    resolvedContext: taskResource.resolved_context?.layers ?? null
  };
}

function validateTaskForConstructorDispatch(
  taskResource: NonNullable<Awaited<ReturnType<typeof getTaskResourceFromDb>>>,
  t: Awaited<ReturnType<typeof getApiT>>
): TaskDispatchReadiness {
  const task = taskResource.task;
  const description = normalizeTaskText(task.description);
  const placeholderDescription = /^(tbd|todo|later|same as title|n\/?a)$/i.test(description);
  const hasSupportingContext = Boolean(
    normalizeTaskText(task.contextHint) ||
      taskResource.comments?.some((comment) => normalizeTaskText(comment.body)) ||
      taskResource.attachments?.length ||
      taskResource.child_tasks?.length ||
      contextLayerHasContent(taskResource.resolved_context?.layers?.workspace) ||
      contextLayerHasContent(taskResource.resolved_context?.layers?.project) ||
      contextLayerHasContent(taskResource.resolved_context?.layers?.task)
  );

  if (!description) {
    return {
      ok: false,
      code: "CONSTRUCTOR_TASK_UNDERSPECIFIED",
      message: t("constructorDispatch.taskUnderspecified")
    };
  }

  if (placeholderDescription || ((description.length < 24 || countWords(description) < 4) && !hasSupportingContext)) {
    return {
      ok: false,
      code: "CONSTRUCTOR_TASK_UNDERSPECIFIED",
      message: t("constructorDispatch.taskUnderspecifiedClearer")
    };
  }

  return { ok: true };
}

function formatTaskInstruction(
  taskResource: NonNullable<Awaited<ReturnType<typeof getTaskResourceFromDb>>>,
  t: Awaited<ReturnType<typeof getApiT>>
) {
  const task = taskResource?.task;
  const childTaskSection = formatBulletSection(
    t("constructorDispatch.childTasks"),
    (taskResource?.child_tasks ?? []).map((child) =>
      t("constructorDispatch.childTaskLine", { id: child.id, title: child.title, status: child.status })
    )
  );
  const commentSection = formatBulletSection(
    t("constructorDispatch.recentComments"),
    taskResource?.comments?.slice(0, 8).reverse().map((comment) =>
      t("constructorDispatch.commentByline", {
        author: comment.author,
        role: comment.role,
        body: comment.body.replace(/\s+/g, " ").trim()
      })
    ) ?? []
  );
  const attachmentSection = formatBulletSection(
    t("constructorDispatch.attachments"),
    taskResource?.attachments?.slice(0, 8).map((attachment) =>
      t("constructorDispatch.attachmentByline", {
        name: attachment.name,
        artifactType: attachment.artifactType,
        author: attachment.author
      })
    ) ?? []
  );
  const taskDetailSection = formatBulletSection(t("constructorDispatch.taskDetails"), [
    task?.status ? t("constructorDispatch.currentMissionControlStatus", { value: task.status }) : null,
    task?.priority ? t("constructorDispatch.priorityLabel", { value: task.priority }) : null,
    task?.assignee ? t("constructorDispatch.assigneeLabel", { value: task.assignee }) : null,
    task?.reviewer ? t("constructorDispatch.reviewerLabel", { value: task.reviewer }) : null,
    task?.project ? t("constructorDispatch.projectLabel", { value: task.project }) : null,
    task?.projectSlug ? t("constructorDispatch.projectSlugLabel", { value: task.projectSlug }) : null,
    task?.tags?.length ? t("constructorDispatch.labelsLabel", { value: task.tags.join(", ") }) : null,
    task?.startDate ? t("constructorDispatch.startDateLabel", { value: task.startDate }) : null,
    task?.due ? t("constructorDispatch.dueDateLabel", { value: task.due }) : null,
    task?.blockedReason ? t("constructorDispatch.blockedReasonLabel", { value: task.blockedReason }) : null,
    task?.contextHint ? t("constructorDispatch.taskHintLabel", { value: task.contextHint }) : null,
    task?.parentTaskId
      ? t("constructorDispatch.parentTaskLabel", {
          value: `${task.parentTaskId}${task.parentTaskTitle ? ` · ${task.parentTaskTitle}` : ""}`
        })
      : null
  ]);
  const effectiveContextSection = formatCompactEffectiveContext(taskResource?.resolved_context?.compact?.effective, t);
  const workspaceContextSection = effectiveContextSection
    ? null
    : formatContextLayer(t("constructorDispatch.workspaceContext"), taskResource?.resolved_context?.layers?.workspace, t);
  const projectContextSection = effectiveContextSection
    ? null
    : formatContextLayer(t("constructorDispatch.projectContext"), taskResource?.resolved_context?.layers?.project, t);
  const taskContextSection = effectiveContextSection
    ? null
    : formatBulletSection(t("constructorDispatch.taskContext"), [
        typeof taskResource?.resolved_context?.layers?.task?.hint === "string" && taskResource.resolved_context.layers.task.hint.trim()
          ? taskResource.resolved_context.layers.task.hint.trim()
          : null
      ]);

  return [
    t("constructorDispatch.instructionIntro"),
    t("constructorDispatch.requestedDeliverable", { value: task?.description?.trim() ?? "" }),
    t("constructorDispatch.taskTitle", { value: task?.title ?? t("constructorDispatch.untitledTask") }),
    taskDetailSection,
    effectiveContextSection,
    workspaceContextSection,
    projectContextSection,
    taskContextSection,
    childTaskSection,
    commentSection,
    attachmentSection,
    [
      t("constructorDispatch.executionRules"),
      `- ${t("constructorDispatch.ruleNoDirectAccess")}`,
      `- ${t("constructorDispatch.ruleNoSelfPosting")}`
    ].join("\n"),
    [
      t("constructorDispatch.responseRequirements"),
      `- ${t("constructorDispatch.responseReturnDeliverable")}`,
      `- ${t("constructorDispatch.responseDirectComment")}`,
      `- ${t("constructorDispatch.responseNoGenericDone")}`,
      `- ${t("constructorDispatch.responseKeepAssumptionsBrief")}`,
      `- ${t("constructorDispatch.responseSayWhatIsMissing")}`
    ].join("\n")
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isConstructorDispatchableMembership(
  value: ConstructorAgentCandidate | null | undefined
): value is ConstructorAgentCandidate & { sourceKey: string } {
  return Boolean(
    value &&
      value.kind === "agent" &&
      value.enabled &&
      typeof value.sourceKey === "string" &&
      value.sourceKey.trim() &&
      value.sourceSystem === "constructor"
  );
}

async function resolveTargetAgent(taskId: string): Promise<ResolvedTargetAgent> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          workspaceId: true,
          slug: true
        }
      },
      assignee: {
        select: {
          name: true,
          kind: true,
          enabled: true,
          sourceSystem: true,
          sourceKey: true
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  if (isConstructorDispatchableMembership(task.assignee)) {
    return {
      projectSlug: task.project.slug,
      targetAgent: task.assignee.sourceKey as string,
      targetAgentLabel: task.assignee.name,
      targetSource: "assignee"
    };
  }

  const defaultAgent = await db.membership.findFirst({
    where: {
      workspaceId: task.project.workspaceId,
      kind: "agent",
      enabled: true,
      sourceSystem: "constructor",
      capabilities: {
        has: "default"
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      name: true,
      sourceKey: true
    }
  });

  if (defaultAgent?.sourceKey) {
    return {
      projectSlug: task.project.slug,
      targetAgent: defaultAgent.sourceKey,
      targetAgentLabel: defaultAgent.name,
      targetSource: "default"
    };
  }

  return {
    projectSlug: task.project.slug,
    error: "CONSTRUCTOR_TARGET_AGENT_REQUIRED"
  };
}

function normalizeDispatchToken(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseExecutionLogValues(line: string) {
  const values: Record<string, string> = {};

  for (const token of line.trim().split(/\s+/).slice(1)) {
    const separatorIndex = token.indexOf("=");
    if (separatorIndex <= 0) continue;
    values[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }

  return values;
}

export async function getLatestConstructorSession(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          logs: {
            orderBy: { createdAt: "desc" },
            select: {
              line: true
            }
          }
        }
      }
    }
  });

  const lines = task?.executions?.[0]?.logs ?? [];

  for (const entry of lines) {
    const trimmed = entry.line.trim();
    if (!trimmed.startsWith("CONSTRUCTOR_")) continue;
    const values = parseExecutionLogValues(trimmed);
    const sessionId = normalizeDispatchToken(values.sessionId);
    const externalTaskId = normalizeDispatchToken(values.externalTaskId);
    const idempotencyKey = normalizeDispatchToken(values.idempotencyKey);

    if (sessionId || externalTaskId || idempotencyKey) {
      return { sessionId, externalTaskId, idempotencyKey };
    }
  }

  return { sessionId: null, externalTaskId: null, idempotencyKey: null };
}

export async function dispatchMissionControlTaskToConstructor(input: ConstructorDispatchOptions) {
  const t = await getApiT();
  const task = await getTaskResourceFromDb(input.taskId);

  if (!task) {
    return { ok: false as const, status: 404, message: t("api.taskNotFound"), details: { taskId: input.taskId } };
  }

  const requestUrl = new URL(input.requestUrl);
  const constructorConfig = await getConstructorConfig();
  const targetAgent = await resolveTargetAgent(input.taskId);
  const missionControlBaseUrl = getMissionControlBaseUrl(requestUrl);
  const taskInfo = task.task;
  const now = Date.now();
  const latestSession = await getLatestConstructorSession(taskInfo.id);
  const externalTaskId = normalizeDispatchToken(input.externalTaskId) ?? latestSession.externalTaskId ?? `mc-task-${taskInfo.id}-${now}`;
  const idempotencyKey = normalizeDispatchToken(input.idempotencyKey) ?? latestSession.idempotencyKey ?? externalTaskId;
  const sessionId = normalizeDispatchToken(input.sessionId) ?? latestSession.sessionId ?? null;
  const callbackUrl = `${missionControlBaseUrl}/api/tasks/${taskInfo.id}/constructor/callback`;

  if ("error" in constructorConfig) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=constructor_disabled", "Constructor");
    return { ok: false as const, status: 409, message: t("api.constructorDispatchDisabled"), details: { code: constructorConfig.error } };
  }

  if (!constructorConfig.apiToken) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=missing_api_token", "Constructor");
    return { ok: false as const, status: 409, message: t("api.constructorDispatchApiTokenRequired"), details: { code: "CONSTRUCTOR_API_TOKEN_REQUIRED" } };
  }

  if (!targetAgent) {
    return { ok: false as const, status: 404, message: t("api.taskNotFound"), details: { taskId: input.taskId } };
  }

  if ("error" in targetAgent) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=missing_target_agent", "Constructor");
    return {
      ok: false as const,
      status: 422,
      message: t("api.constructorTargetAgentRequired"),
      details: { code: targetAgent.error }
    };
  }

  const taskReadiness = validateTaskForConstructorDispatch(task, t);

  if (!taskReadiness.ok) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=underspecified_task", "Constructor");
    return { ok: false as const, status: 422, message: taskReadiness.message, details: { code: taskReadiness.code } };
  }

  let upstreamResult: Awaited<ReturnType<typeof dispatchConstructorTask>>;

  try {
    upstreamResult = await dispatchConstructorTask({
      baseUrl: constructorConfig.baseUrl,
      apiToken: constructorConfig.apiToken,
      body: {
        externalTaskId,
        idempotencyKey,
        ...(sessionId ? { sessionId } : {}),
        targetAgent: targetAgent.targetAgent,
        instruction: input.instruction?.trim() || formatTaskInstruction(task, t),
        context: {
          missionControl: buildMissionControlContext(task),
          constructor: {
            mode: "mission-control-dispatch",
            expectedDelivery: "complete the requested task and return only the final answer through the Constructor callback so Mission Control can post it to task comments"
          }
        },
        metadata: {
          origin: "mission-control-ui",
          taskId: taskInfo.id,
          integration: "constructor",
          ...(input.metadata ?? {})
        },
        routingHints: input.routingHints ?? {},
        callback: {
          required: true,
          url: callbackUrl
        },
        retryPolicy: {
          maxDispatchAttempts: 5,
          maxCallbackAttempts: 5
        },
        timeoutPolicy: {
          executionTimeoutMs: 300000,
          dispatchTimeoutMs: 30000,
          callbackTimeoutMs: 10000
        }
      }
    });
  } catch {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=constructor_unreachable", "Constructor");
    return {
      ok: false as const,
      status: 502,
      message: t("api.constructorUnreachable"),
      details: {
        code: "CONSTRUCTOR_UNREACHABLE",
        constructorBaseUrl: constructorConfig.baseUrl
      }
    };
  }

  const upstreamJson = upstreamResult.payload;

  if (!upstreamResult.response.ok || !upstreamJson?.accepted) {
    const failureMessage = upstreamJson?.rejection?.reason ?? upstreamJson?.message ?? upstreamJson?.error ?? t("api.constructorRejectedTask");

    await appendSystemExecutionLogInDb(
      taskInfo.id,
      `CONSTRUCTOR_DISPATCH_FAILED targetAgent=${targetAgent.targetAgent} message=${failureMessage.replace(/\s+/g, "_")}`,
      "Constructor"
    );

    return {
      ok: false as const,
      status: upstreamResult.response.status === 400 ? 422 : 502,
      message: failureMessage,
      details: {
        code: upstreamJson?.rejection?.code ?? upstreamJson?.error ?? "CONSTRUCTOR_DISPATCH_FAILED",
        constructorBaseUrl: constructorConfig.baseUrl
      }
    };
  }

  await db.task.update({
    where: { id: input.taskId },
    data: {
      status: "in_progress",
      blockedReason: null
    }
  });

  const resolvedSessionId = normalizeDispatchToken((upstreamJson as Record<string, unknown>)?.sessionId as string | undefined) ?? sessionId;

  await appendSystemExecutionLogInDb(
    taskInfo.id,
    `CONSTRUCTOR_DISPATCH_ACCEPTED targetAgent=${targetAgent.targetAgent} targetSource=${targetAgent.targetSource} bridgeExecutionId=${upstreamJson.bridgeExecutionId ?? "none"} externalTaskId=${upstreamJson.externalTaskId ?? externalTaskId} idempotencyKey=${idempotencyKey} executionState=${upstreamJson.executionState ?? "queued"}${resolvedSessionId ? ` sessionId=${resolvedSessionId}` : ""}${upstreamJson.deduplicated ? " deduplicated=true" : ""}`,
    "Constructor"
  );

  revalidatePath(`/tasks/${input.taskId}`);
  if (taskInfo.projectSlug) {
    revalidatePath(`/projects/${taskInfo.projectSlug}/tasks/${input.taskId}`);
    revalidatePath(`/projects/${taskInfo.projectSlug}`);
  }
  revalidatePath("/my-tasks");
  revalidatePath("/queue");

  return {
    ok: true as const,
    status: upstreamResult.response.status === 200 ? 200 : 202,
    body: {
      dispatch: {
        accepted: true,
        deduplicated: upstreamJson.deduplicated ?? false,
        bridgeExecutionId: upstreamJson.bridgeExecutionId,
        externalTaskId: upstreamJson.externalTaskId ?? externalTaskId,
        idempotencyKey,
        sessionId: resolvedSessionId,
        executionState: upstreamJson.executionState ?? "queued",
        targetAgent: targetAgent.targetAgent,
        targetSource: targetAgent.targetSource,
        targetAgentLabel: targetAgent.targetAgentLabel,
        message: upstreamJson.message ?? t("api.constructorTaskAccepted")
      }
    }
  };
}

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const result = await dispatchMissionControlTaskToConstructor({
    requestUrl: request.url,
    taskId: params.taskId
  });

  if (!result.ok) {
    return error(result.message, result.status, result.details);
  }

  return ok(result.body, { status: result.status });
}
