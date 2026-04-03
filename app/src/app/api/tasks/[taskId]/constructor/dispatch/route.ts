import { revalidatePath } from "next/cache";
import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getActiveWorkspaceConstructorIntegration, getTaskResourceFromDb } from "@/lib/server-data";

async function getConstructorBaseUrl() {
  const integration = await getActiveWorkspaceConstructorIntegration();

  if (integration?.enabled !== false && integration?.baseUrl?.trim()) {
    return integration.baseUrl.trim().replace(/\/+$/, "");
  }

  return process.env.CONSTRUCTOR_BASE_URL?.trim() || "http://127.0.0.1:8787";
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

function formatTaskInstruction(taskResource: Awaited<ReturnType<typeof getTaskResourceFromDb>>, overrideInstruction?: string | null) {
  const override = overrideInstruction?.trim();
  if (override) {
    return override;
  }

  const task = taskResource?.task;

  const commentLines = taskResource?.comments?.length
    ? taskResource.comments
        .slice(0, 8)
        .reverse()
        .map((comment) => `- ${comment.author} (${comment.role}): ${comment.body.replace(/\s+/g, " ").trim()}`)
    : [];

  return [
    `Task: ${task?.title ?? "Untitled task"}`,
    task?.description?.trim() ? `Description: ${task.description.trim()}` : null,
    task?.status ? `Current status: ${task.status}` : null,
    task?.priority ? `Priority: ${task.priority}` : null,
    commentLines.length ? "Recent task comments:\n" + commentLines.join("\n") : null,
    "Your job is to generate the final answer for this task using only the information included in this request.",
    "Do not attempt to access Mission Control directly.",
    "Do not call APIs, inspect the app, or post comments yourself.",
    "Return only the final answer text that Mission Control should post into task comments.",
    "Keep the answer concise, practical, and ready to paste as a task comment."
  ]
    .filter(Boolean)
    .join("\n\n");
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

  const body = (await request.json().catch(() => null)) as { instruction?: string } | null;
  const requestUrl = new URL(request.url);
  const constructorBaseUrl = await getConstructorBaseUrl();
  const missionControlBaseUrl = getMissionControlBaseUrl(requestUrl);
  const taskInfo = task.task;
  const externalTaskId = `mc-task-${taskInfo.id}-${Date.now()}`;
  const callbackUrl = `${missionControlBaseUrl}/api/tasks/${taskInfo.id}/constructor/callback`;

  const payload = {
    version: "v1",
    source: "mission-control",
    eventType: "task.execute",
    eventId: `evt-${crypto.randomUUID()}`,
    idempotencyKey: `idem-${taskInfo.id}-${Date.now()}`,
    traceId: `trace-${crypto.randomUUID()}`,
    occurredAt: new Date().toISOString(),
    payload: {
      externalTaskId,
      targetAgent: "main",
      instruction: formatTaskInstruction(task, body?.instruction),
      context: {
        missionControl: {
          taskId: taskInfo.id,
          title: taskInfo.title,
          status: taskInfo.status,
          priority: taskInfo.priority,
          assignee: taskInfo.assignee,
          project: taskInfo.project,
          projectSlug: taskInfo.projectSlug,
          due: taskInfo.due
        },
        constructor: {
          mode: "mission-control-dispatch",
          expectedDelivery: "return final answer through Constructor callback so Mission Control can post the task comment"
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
  };

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${constructorBaseUrl}/source/mission-control/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  } catch {
    return error("Constructor is unreachable.", 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl
    });
  }

  const upstreamJson = await upstreamResponse.json().catch(() => null) as
    | {
        accepted?: boolean;
        bridgeExecutionId?: string;
        externalTaskId?: string;
        executionState?: string;
        message?: string;
        rejection?: { code?: string; reason?: string };
      }
    | null;

  if (!upstreamResponse.ok || !upstreamJson?.accepted) {
    return error(
      upstreamJson?.rejection?.reason ?? upstreamJson?.message ?? "Constructor rejected the task.",
      upstreamResponse.ok ? 422 : 502,
      {
        code: upstreamJson?.rejection?.code ?? "CONSTRUCTOR_DISPATCH_FAILED",
        constructorBaseUrl
      }
    );
  }

  revalidatePath(`/tasks/${params.taskId}`);
  if (taskInfo.projectSlug) {
    revalidatePath(`/projects/${taskInfo.projectSlug}/tasks/${params.taskId}`);
    revalidatePath(`/projects/${taskInfo.projectSlug}`);
  }
  revalidatePath(`/my-tasks`);
  revalidatePath(`/queue`);

  return ok(
    {
      dispatch: {
        accepted: true,
        bridgeExecutionId: upstreamJson.bridgeExecutionId,
        externalTaskId: upstreamJson.externalTaskId ?? externalTaskId,
        executionState: upstreamJson.executionState ?? "queued",
        message: upstreamJson.message ?? "Task accepted by Constructor. Mission Control will post the final answer to task comments after the callback arrives."
      }
    },
    { status: 202 }
  );
}
