import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { fetchConstructorTaskSummary, type ConstructorTaskSummaryItem } from "@/lib/constructor";
import { db } from "@/lib/db";
import { appendSystemExecutionLogInDb } from "@/lib/server-data";

type ConstructorTracking = {
  bridgeExecutionId: string | null;
  externalTaskId: string | null;
  executionState: string | null;
  callbackState: string | null;
  cancellationState: string | null;
};

function normalizeToken(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseLogKeyValues(line: string) {
  const values: Record<string, string> = {};

  for (const token of line.trim().split(/\s+/).slice(1)) {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    values[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }

  return values;
}

function parseConstructorTrackingLine(line: string): ConstructorTracking | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("CONSTRUCTOR_")) {
    return null;
  }

  const values = parseLogKeyValues(trimmed);
  const bridgeExecutionId = normalizeToken(values.bridgeExecutionId);
  const externalTaskId = normalizeToken(values.externalTaskId);

  if (!bridgeExecutionId && !externalTaskId) {
    return null;
  }

  return {
    bridgeExecutionId,
    externalTaskId,
    executionState: normalizeToken(values.executionState),
    callbackState: normalizeToken(values.callbackState),
    cancellationState: normalizeToken(values.cancellationState)
  };
}

function findLatestConstructorTracking(lines: string[]) {
  for (const line of lines) {
    const tracking = parseConstructorTrackingLine(line);

    if (tracking) {
      return tracking;
    }
  }

  return null;
}

function isActiveExecutionState(value: string | null | undefined) {
  return value === "queued" || value === "dispatching" || value === "running";
}

function mapExecutionStatus(value: string | null | undefined) {
  switch (value) {
    case "queued":
    case "dispatching":
      return "queued" as const;
    case "running":
      return "running" as const;
    case "completed":
      return "done" as const;
    case "failed":
    case "timed_out":
    case "canceled":
      return "failed" as const;
    default:
      return null;
  }
}

function getBlockedReason(value: string | null | undefined) {
  switch (value) {
    case "failed":
      return "Constructor execution failed.";
    case "timed_out":
      return "Constructor execution timed out.";
    case "canceled":
      return "Constructor execution was canceled.";
    default:
      return null;
  }
}

function getTaskPatchForExecutionState(value: string | null | undefined) {
  switch (value) {
    case "queued":
    case "dispatching":
    case "running":
      return { status: "in_progress" as const, blockedReason: null };
    case "completed":
      return { status: "review" as const, blockedReason: null };
    case "failed":
    case "timed_out":
    case "canceled":
      return { status: "blocked" as const, blockedReason: getBlockedReason(value) };
    default:
      return null;
  }
}

function getExecutionSummary(item: ConstructorTaskSummaryItem) {
  const latestText = typeof item.latestResult?.text === "string" ? item.latestResult.text.trim() : "";

  if (latestText) {
    return latestText;
  }

  const terminalReason = typeof item.latestResult?.terminalReason === "string" ? item.latestResult.terminalReason.trim() : "";
  return terminalReason || null;
}

function buildStatusLine(item: ConstructorTaskSummaryItem) {
  return [
    "CONSTRUCTOR_STATUS",
    item.bridgeExecutionId ? `bridgeExecutionId=${item.bridgeExecutionId}` : null,
    item.externalTaskId ? `externalTaskId=${item.externalTaskId}` : null,
    item.executionState ? `executionState=${item.executionState}` : null,
    item.callbackState ? `callbackState=${item.callbackState}` : null,
    item.cancellationState ? `cancellationState=${item.cancellationState}` : null,
    item.runtimeName ? `runtimeName=${item.runtimeName}` : null
  ]
    .filter(Boolean)
    .join(" ");
}

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "execution.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await db.task.findUnique({
    where: { id: params.taskId },
    select: {
      id: true,
      status: true,
      blockedReason: true,
      project: {
        select: {
          workspaceId: true
        }
      },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          summary: true,
          blockedReason: true,
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

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  const latestExecution = task.executions[0] ?? null;
  const logLines = latestExecution?.logs.map((entry) => entry.line) ?? [];
  const tracking = findLatestConstructorTracking(logLines);

  if (!tracking?.bridgeExecutionId && !tracking?.externalTaskId) {
    return ok({
      tracked: false,
      active: false,
      refresh: false
    });
  }

  const integration = await db.workspaceConstructorIntegration.findUnique({
    where: { workspaceId: task.project.workspaceId }
  });

  if (integration?.enabled === false) {
    return ok({
      tracked: true,
      active: false,
      refresh: true
    });
  }

  const baseUrl = integration?.baseUrl?.trim() || process.env.CONSTRUCTOR_BASE_URL?.trim() || "http://127.0.0.1:8787";
  const apiToken = integration?.apiToken?.trim() || process.env.CONSTRUCTOR_API_TOKEN?.trim() || null;

  if (!apiToken) {
    return error("Constructor API token is required before polling task status.", 409, {
      code: "CONSTRUCTOR_API_TOKEN_REQUIRED"
    });
  }

  let summaryResult: Awaited<ReturnType<typeof fetchConstructorTaskSummary>>;

  try {
    summaryResult = await fetchConstructorTaskSummary({
      baseUrl,
      apiToken,
      bridgeExecutionId: tracking.bridgeExecutionId ?? undefined,
      externalTaskId: tracking.externalTaskId ?? undefined
    });
  } catch {
    return error("Constructor is unreachable.", 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: baseUrl
    });
  }

  const upstreamJson = summaryResult.payload;

  if (summaryResult.response.status === 404) {
    return ok({
      tracked: true,
      active: false,
      refresh: false,
      missing: true
    });
  }

  if (!summaryResult.response.ok || !upstreamJson?.item) {
    const detail = upstreamJson?.message ?? upstreamJson?.error ?? `Constructor task lookup failed with status ${summaryResult.response.status}.`;

    return error(detail, 502, {
      code: upstreamJson?.error ?? "CONSTRUCTOR_STATUS_LOOKUP_FAILED",
      constructorBaseUrl: baseUrl
    });
  }

  const item = upstreamJson.item;
  let refresh = !isActiveExecutionState(item.executionState);
  const latestStatusLine = logLines.find((line) => line.startsWith("CONSTRUCTOR_STATUS ")) ?? null;
  const nextStatusLine = buildStatusLine(item);

  if (latestStatusLine !== nextStatusLine) {
    await appendSystemExecutionLogInDb(params.taskId, nextStatusLine, "Constructor");
    refresh = true;
  }

  const nextExecutionStatus = mapExecutionStatus(item.executionState);
  const nextExecutionSummary = getExecutionSummary(item);
  const nextExecutionBlockedReason = getBlockedReason(item.executionState);

  if (latestExecution?.id) {
    const executionPatch: {
      status?: "queued" | "running" | "done" | "failed";
      summary?: string | null;
      blockedReason?: string | null;
    } = {};

    if (nextExecutionStatus && latestExecution.status !== nextExecutionStatus) {
      executionPatch.status = nextExecutionStatus;
    }

    if ((latestExecution.summary ?? null) !== (nextExecutionSummary ?? null)) {
      executionPatch.summary = nextExecutionSummary ?? null;
    }

    if ((latestExecution.blockedReason ?? null) !== (nextExecutionBlockedReason ?? null)) {
      executionPatch.blockedReason = nextExecutionBlockedReason;
    }

    if (Object.keys(executionPatch).length) {
      await db.taskExecution.update({
        where: { id: latestExecution.id },
        data: executionPatch
      });
      refresh = true;
    }
  }

  const nextTaskPatch = getTaskPatchForExecutionState(item.executionState);

  if (
    nextTaskPatch &&
    (task.status !== nextTaskPatch.status || (task.blockedReason ?? null) !== (nextTaskPatch.blockedReason ?? null))
  ) {
    await db.task.update({
      where: { id: params.taskId },
      data: nextTaskPatch
    });
    refresh = true;
  }

  return ok({
    tracked: true,
    active: isActiveExecutionState(item.executionState),
    refresh,
    executionState: item.executionState ?? null,
    callbackState: item.callbackState ?? null,
    cancellationState: item.cancellationState ?? null
  });
}