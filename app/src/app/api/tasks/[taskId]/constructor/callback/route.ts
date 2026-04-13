import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  appendSystemExecutionLogInDb,
  createCommentInDb
} from "@/lib/server-data";

type CallbackTaskRecord = {
  project: { workspaceId: string };
  assignee: {
    id: string;
    name: string;
    kind: string;
    sourceSystem: string | null;
    sourceKey: string | null;
    roleLabel: string | null;
  } | null;
  executions: Array<{
    logs: Array<{ line: string }>;
  }>;
};

type CallbackCommentAuthor = {
  author: string;
  role: string;
  membershipId?: string | null;
};

function normalizeToken(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function extractResultText(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed || null;
  }

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const text = extractResultText(entry);
      if (text) return text;
    }
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of ["text", "message", "summary"]) {
    const text = extractResultText(record[key]);
    if (text) return text;
  }

  for (const key of ["result", "payload", "data", "error"]) {
    const nested = extractResultText(record[key]);
    if (nested) return nested;
  }

  return null;
}

function formatCallbackComment(event: Record<string, unknown>) {
  const eventType = typeof event.eventType === "string" ? event.eventType : "execution.unknown";
  const payload = event.payload && typeof event.payload === "object" ? (event.payload as Record<string, unknown>) : {};
  const resultText = extractResultText(payload.result);
  const errorText = extractResultText(payload.error);

  if (eventType === "execution.completed") {
    return resultText ?? "Task completed, but no result text was included in the callback payload.";
  }

  if (eventType === "execution.failed") {
    return errorText ?? "The execution failed before a final answer was returned.";
  }

  if (eventType === "execution.timed_out") {
    return errorText ?? "Constructor execution timed out.";
  }

  if (eventType === "execution.canceled") {
    return errorText ?? "Constructor execution was canceled.";
  }

  return resultText ?? errorText ?? "Constructor sent a terminal update without a final answer.";
}

function extractDispatchTargetAgent(logs: Array<{ line: string }>) {
  for (const log of logs) {
    const match = log.line.match(/(?:^|\s)targetAgent=([^\s]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function resolveCallbackCommentAuthor(task: CallbackTaskRecord, event: Record<string, unknown>) {
  const assignee = task.assignee;

  if (assignee?.kind === "agent" && assignee.sourceSystem === "constructor") {
    return {
      author: assignee.name,
      role: assignee.roleLabel ?? "Agent",
      membershipId: assignee.id
    } satisfies CallbackCommentAuthor;
  }

  const meta = event.meta && typeof event.meta === "object" ? (event.meta as Record<string, unknown>) : {};
  const targetAgent =
    normalizeToken(meta.targetAgent) ??
    normalizeToken(event.targetAgent) ??
    extractDispatchTargetAgent(task.executions[0]?.logs ?? []);

  if (targetAgent) {
    const membership = await db.membership.findFirst({
      where: {
        workspaceId: task.project.workspaceId,
        kind: "agent",
        sourceSystem: "constructor",
        OR: [{ sourceKey: targetAgent }, { name: targetAgent }]
      },
      select: {
        id: true,
        name: true,
        roleLabel: true
      }
    });

    if (membership) {
      return {
        author: membership.name,
        role: membership.roleLabel ?? "Agent",
        membershipId: membership.id
      } satisfies CallbackCommentAuthor;
    }
  }

  return {
    author: "Constructor",
    role: "Agent",
    membershipId: null
  } satisfies CallbackCommentAuthor;
}

function getCallbackTaskPatch(event: Record<string, unknown>): Prisma.TaskUpdateInput | null {
  const eventType = typeof event.eventType === "string" ? event.eventType : "execution.unknown";

  if (eventType === "execution.completed") {
    return { status: TaskStatus.review, blockedReason: null };
  }

  if (eventType === "execution.failed") {
    return { status: TaskStatus.blocked, blockedReason: "Constructor execution failed." };
  }

  if (eventType === "execution.timed_out") {
    return { status: TaskStatus.blocked, blockedReason: "Constructor execution timed out." };
  }

  if (eventType === "execution.canceled") {
    return { status: TaskStatus.blocked, blockedReason: "Constructor execution was canceled." };
  }

  return null;
}

async function claimCallbackReceipt(taskId: string, source: string, eventType: string, bridgeExecutionId: string | null) {
  if (!bridgeExecutionId) {
    return { claimed: true as const };
  }

  try {
    await db.taskCallbackReceipt.create({
      data: {
        taskId,
        source,
        eventType,
        bridgeExecutionId
      }
    });

    return { claimed: true as const };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { claimed: false as const };
    }

    throw error;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      project: {
        select: {
          workspaceId: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          kind: true,
          sourceSystem: true,
          sourceKey: true,
          roleLabel: true
        }
      },
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

  if (!task) {
    return NextResponse.json({ ok: false, error: { message: "Task not found" } }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: { message: "Invalid callback payload" } }, { status: 400 });
  }

  const commentBody = formatCallbackComment(payload);
  const taskPatch = getCallbackTaskPatch(payload);
  const bridgeExecutionId = typeof payload.bridgeExecutionId === "string" ? payload.bridgeExecutionId : null;
  const eventType = typeof payload.eventType === "string" ? payload.eventType : "execution.unknown";
  const source = typeof payload.source === "string" ? payload.source : "constructor";
  const receipt = await claimCallbackReceipt(taskId, source, eventType, bridgeExecutionId);

  if (!receipt.claimed) {
    await appendSystemExecutionLogInDb(
      taskId,
      `CONSTRUCTOR_CALLBACK_DUPLICATE_IGNORED event=${eventType}${bridgeExecutionId ? ` bridgeExecutionId=${bridgeExecutionId}` : ""}`,
      "Constructor"
    );

    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (taskPatch) {
    await db.task.update({
      where: { id: taskId },
      data: taskPatch
    });
  }

  await appendSystemExecutionLogInDb(
    taskId,
    `CONSTRUCTOR_CALLBACK_RECEIVED event=${eventType}${bridgeExecutionId ? ` bridgeExecutionId=${bridgeExecutionId}` : ""}`,
    "Constructor"
  );

  const commentAuthor = await resolveCallbackCommentAuthor(task, payload);

  const comment = await createCommentInDb(taskId, {
    author: commentAuthor.author,
    role: commentAuthor.role,
    tone: "agent",
    membershipId: commentAuthor.membershipId,
    body: commentBody
  });

  if (!comment || "error" in comment) {
    return NextResponse.json({ ok: false, error: { message: "Failed to write callback comment" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, commentId: comment.id });
}
