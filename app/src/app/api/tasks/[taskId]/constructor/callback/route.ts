import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  appendSystemExecutionLogInDb,
  createCommentInDb,
  getActiveWorkspaceConstructorIntegrationRecord,
  getTaskResourceFromDb
} from "@/lib/server-data";

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
  const bridgeExecutionId = typeof event.bridgeExecutionId === "string" ? event.bridgeExecutionId : null;
  const externalTaskId = typeof event.externalTaskId === "string" ? event.externalTaskId : null;
  const payload = event.payload && typeof event.payload === "object" ? (event.payload as Record<string, unknown>) : {};
  const resultText = extractResultText(payload.result);
  const errorText = extractResultText(payload.error);

  if (eventType === "execution.completed") {
    return [
      "Constructor final answer",
      bridgeExecutionId ? `Bridge execution: ${bridgeExecutionId}` : null,
      externalTaskId ? `External task: ${externalTaskId}` : null,
      resultText ? "" : null,
      resultText ?? "Task completed, but no result text was included in the callback payload."
    ].filter(Boolean).join("\n");
  }

  if (eventType === "execution.failed") {
    return [
      "Constructor execution failed",
      bridgeExecutionId ? `Bridge execution: ${bridgeExecutionId}` : null,
      externalTaskId ? `External task: ${externalTaskId}` : null,
      "",
      errorText ?? "The execution failed before a final answer was returned."
    ].filter(Boolean).join("\n");
  }

  if (eventType === "execution.timed_out") {
    return [
      "Constructor execution timed out",
      bridgeExecutionId ? `Bridge execution: ${bridgeExecutionId}` : null,
      externalTaskId ? `External task: ${externalTaskId}` : null
    ].filter(Boolean).join("\n");
  }

  if (eventType === "execution.canceled") {
    return [
      "Constructor execution canceled",
      bridgeExecutionId ? `Bridge execution: ${bridgeExecutionId}` : null,
      externalTaskId ? `External task: ${externalTaskId}` : null
    ].filter(Boolean).join("\n");
  }

  return [
    "Constructor terminal update",
    bridgeExecutionId ? `Bridge execution: ${bridgeExecutionId}` : null,
    externalTaskId ? `External task: ${externalTaskId}` : null,
    resultText ? "" : null,
    resultText ?? null
  ].filter(Boolean).join("\n");
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

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
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
  const task = await getTaskResourceFromDb(taskId);

  if (!task) {
    return NextResponse.json({ ok: false, error: { message: "Task not found" } }, { status: 404 });
  }

  const integration = await getActiveWorkspaceConstructorIntegrationRecord();
  const expectedToken = integration?.callbackToken?.trim() || null;

  if (expectedToken) {
    const token = getBearerToken(request);

    if (token !== expectedToken) {
      return NextResponse.json({ ok: false, error: { message: "Constructor callback unauthorized" } }, { status: 401 });
    }
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

  const comment = await createCommentInDb(taskId, {
    author: "Constructor",
    role: "Agent",
    tone: "agent",
    body: commentBody
  });

  if (!comment || "error" in comment) {
    return NextResponse.json({ ok: false, error: { message: "Failed to write callback comment" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, commentId: comment.id });
}
