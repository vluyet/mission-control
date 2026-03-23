import { NextRequest, NextResponse } from "next/server";
import { handleOpenClawTaskWebhookInDb } from "@/lib/server/openclaw-server";

function getExpectedToken() {
  return process.env.OPENCLAW_WEBHOOK_TOKEN?.trim() || process.env.MISSION_CONTROL_OPENCLAW_WEBHOOK_TOKEN?.trim() || "";
}

function getProvidedToken(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const headerToken = request.headers.get("x-openclaw-webhook-token")?.trim();
  if (headerToken) return headerToken;

  return request.nextUrl.searchParams.get("token")?.trim() || "";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const expectedToken = getExpectedToken();
  const providedToken = getProvidedToken(request);

  if (expectedToken && providedToken !== expectedToken) {
    return NextResponse.json({ ok: false, error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { taskId } = await params;
  const payload = await request.json().catch(() => null);
  const result = await handleOpenClawTaskWebhookInDb(taskId, payload);

  if (result && "error" in result) {
    const status = result.error === "TASK_NOT_FOUND" ? 404 : result.error === "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" ? 409 : 422;
    return NextResponse.json({ ok: false, error: result }, { status });
  }

  return NextResponse.json({ ok: true, result });
}
