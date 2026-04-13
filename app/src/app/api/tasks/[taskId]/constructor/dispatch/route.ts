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

function formatContextLayer(title: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bullets = Array.isArray(record.bullets)
    ? record.bullets.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
    : [];
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const layerTitle = typeof record.title === "string" ? record.title.trim() : "";

  return formatBulletSection(title, [
    layerTitle && layerTitle !== title ? `Title: ${layerTitle}` : null,
    summary ? `Summary: ${summary}` : null,
    ...bullets
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

function validateTaskForConstructorDispatch(taskResource: NonNullable<Awaited<ReturnType<typeof getTaskResourceFromDb>>>): TaskDispatchReadiness {
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
      message:
        "Add a task description before dispatch. Include the requested deliverable, key constraints, and any source material or context the agent should use."
    };
  }

  if (placeholderDescription || ((description.length < 24 || countWords(description) < 4) && !hasSupportingContext)) {
    return {
      ok: false,
      code: "CONSTRUCTOR_TASK_UNDERSPECIFIED",
      message:
        "Add a clearer task description before dispatch. State the requested deliverable, the important constraints, and any source material or context the agent should use."
    };
  }

  return { ok: true };
}

function formatTaskInstruction(taskResource: NonNullable<Awaited<ReturnType<typeof getTaskResourceFromDb>>>) {
  const task = taskResource?.task;
  const childTaskSection = formatBulletSection(
    "Child tasks",
    (taskResource?.child_tasks ?? []).map((child) => `${child.id}: ${child.title} (${child.status})`)
  );
  const commentSection = formatBulletSection(
    "Recent comments",
    taskResource?.comments?.slice(0, 8).reverse().map((comment) => `${comment.author} (${comment.role}): ${comment.body.replace(/\s+/g, " ").trim()}`) ?? []
  );
  const attachmentSection = formatBulletSection(
    "Attachments",
    taskResource?.attachments?.slice(0, 8).map((attachment) => `${attachment.name} (${attachment.artifactType}) by ${attachment.author}`) ?? []
  );
  const taskDetailSection = formatBulletSection("Task details", [
    task?.status ? `Current Mission Control status: ${task.status}` : null,
    task?.priority ? `Priority: ${task.priority}` : null,
    task?.assignee ? `Assignee: ${task.assignee}` : null,
    task?.reviewer ? `Reviewer: ${task.reviewer}` : null,
    task?.project ? `Project: ${task.project}` : null,
    task?.projectSlug ? `Project slug: ${task.projectSlug}` : null,
    task?.tags?.length ? `Labels: ${task.tags.join(", ")}` : null,
    task?.startDate ? `Start date: ${task.startDate}` : null,
    task?.due ? `Due date: ${task.due}` : null,
    task?.blockedReason ? `Blocked reason: ${task.blockedReason}` : null,
    task?.contextHint ? `Task hint: ${task.contextHint}` : null,
    task?.parentTaskId ? `Parent task: ${task.parentTaskId}${task.parentTaskTitle ? ` · ${task.parentTaskTitle}` : ""}` : null
  ]);
  const workspaceContextSection = formatContextLayer("Workspace context", taskResource?.resolved_context?.layers?.workspace);
  const projectContextSection = formatContextLayer("Project context", taskResource?.resolved_context?.layers?.project);
  const taskContextSection = formatBulletSection("Task context", [
    typeof taskResource?.resolved_context?.layers?.task?.hint === "string" && taskResource.resolved_context.layers.task.hint.trim()
      ? taskResource.resolved_context.layers.task.hint.trim()
      : null
  ]);

  return [
    "You are working on a Mission Control task.",
    `Requested deliverable:\n${task?.description?.trim()}`,
    `Task title: ${task?.title ?? "Untitled task"}`,
    taskDetailSection,
    workspaceContextSection,
    projectContextSection,
    taskContextSection,
    childTaskSection,
    commentSection,
    attachmentSection,
    [
      "Execution rules:",
      "- Use only the information supplied in this task payload.",
      "- Do not attempt to access Mission Control directly.",
      "- Do not inspect the app or post comments yourself."
    ].join("\n"),
    [
      "Response requirements:",
      "- Return the actual deliverable or answer requested above.",
      "- Write it so Mission Control can post it directly as a task comment.",
      "- Do not reply with a generic acknowledgement like \"Done\" unless the task explicitly asks for that.",
      "- Keep assumptions brief and include them only when they materially affect the result.",
      "- If the request still cannot be completed from the supplied information, say exactly what is missing."
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

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }
  const requestUrl = new URL(request.url);
  const constructorConfig = await getConstructorConfig();
  const targetAgent = await resolveTargetAgent(params.taskId);
  const missionControlBaseUrl = getMissionControlBaseUrl(requestUrl);
  const taskInfo = task.task;
  const now = Date.now();
  const externalTaskId = `mc-task-${taskInfo.id}-${now}`;
  const idempotencyKey = `mc-task-${taskInfo.id}-${now}`;
  const callbackUrl = `${missionControlBaseUrl}/api/tasks/${taskInfo.id}/constructor/callback`;

  if ("error" in constructorConfig) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=constructor_disabled", "Constructor");
    return error("Constructor dispatch is disabled for this workspace.", 409, { code: constructorConfig.error });
  }

  if (!constructorConfig.apiToken) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=missing_api_token", "Constructor");
    return error("Constructor API token is required before dispatch.", 409, { code: "CONSTRUCTOR_API_TOKEN_REQUIRED" });
  }

  if (!targetAgent) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  if ("error" in targetAgent) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=missing_target_agent", "Constructor");
    return error(
      "Assign the task to a Constructor agent or sync a default Constructor agent before dispatch.",
      422,
      { code: targetAgent.error }
    );
  }

  const taskReadiness = validateTaskForConstructorDispatch(task);

  if (!taskReadiness.ok) {
    await appendSystemExecutionLogInDb(taskInfo.id, "CONSTRUCTOR_DISPATCH_FAILED reason=underspecified_task", "Constructor");
    return error(taskReadiness.message, 422, { code: taskReadiness.code });
  }

  let upstreamResult: Awaited<ReturnType<typeof dispatchConstructorTask>>;

  try {
    upstreamResult = await dispatchConstructorTask({
      baseUrl: constructorConfig.baseUrl,
      apiToken: constructorConfig.apiToken,
      body: {
        externalTaskId,
        idempotencyKey,
        targetAgent: targetAgent.targetAgent,
        instruction: formatTaskInstruction(task),
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
          integration: "constructor"
        },
        routingHints: {},
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
    return error("Constructor is unreachable.", 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: constructorConfig.baseUrl
    });
  }

  const upstreamJson = upstreamResult.payload;

  if (!upstreamResult.response.ok || !upstreamJson?.accepted) {
    const failureMessage = upstreamJson?.rejection?.reason ?? upstreamJson?.message ?? upstreamJson?.error ?? "Constructor rejected the task.";

    await appendSystemExecutionLogInDb(
      taskInfo.id,
      `CONSTRUCTOR_DISPATCH_FAILED targetAgent=${targetAgent.targetAgent} message=${failureMessage.replace(/\s+/g, "_")}`,
      "Constructor"
    );

    return error(failureMessage, upstreamResult.response.status === 400 ? 422 : 502, {
      code: upstreamJson?.rejection?.code ?? upstreamJson?.error ?? "CONSTRUCTOR_DISPATCH_FAILED",
      constructorBaseUrl: constructorConfig.baseUrl
    });
  }

  await db.task.update({
    where: { id: params.taskId },
    data: {
      status: "in_progress",
      blockedReason: null
    }
  });

  await appendSystemExecutionLogInDb(
    taskInfo.id,
    `CONSTRUCTOR_DISPATCH_ACCEPTED targetAgent=${targetAgent.targetAgent} targetSource=${targetAgent.targetSource} bridgeExecutionId=${upstreamJson.bridgeExecutionId ?? "none"} externalTaskId=${upstreamJson.externalTaskId ?? externalTaskId} executionState=${upstreamJson.executionState ?? "queued"}${upstreamJson.deduplicated ? " deduplicated=true" : ""}`,
    "Constructor"
  );

  revalidatePath(`/tasks/${params.taskId}`);
  if (taskInfo.projectSlug) {
    revalidatePath(`/projects/${taskInfo.projectSlug}/tasks/${params.taskId}`);
    revalidatePath(`/projects/${taskInfo.projectSlug}`);
  }
  revalidatePath("/my-tasks");
  revalidatePath("/queue");

  return ok(
    {
      dispatch: {
        accepted: true,
        deduplicated: upstreamJson.deduplicated ?? false,
        bridgeExecutionId: upstreamJson.bridgeExecutionId,
        externalTaskId: upstreamJson.externalTaskId ?? externalTaskId,
        executionState: upstreamJson.executionState ?? "queued",
        targetAgent: targetAgent.targetAgent,
        targetSource: targetAgent.targetSource,
        targetAgentLabel: targetAgent.targetAgentLabel,
        message: upstreamJson.message ?? "Task accepted by Constructor. Mission Control will post the final answer to task comments after the callback arrives."
      }
    },
    { status: upstreamResult.response.status === 200 ? 200 : 202 }
  );
}