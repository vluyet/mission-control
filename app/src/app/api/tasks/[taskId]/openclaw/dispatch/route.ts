import { error, ok } from "@/lib/api-response";
import { dispatchTaskToOpenClawInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const requestUrl = new URL(request.url);
  const result = await dispatchTaskToOpenClawInDb(params.taskId, { missionControlBaseUrl: requestUrl.origin });

  if (!result) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  if ("error" in result) {
    const code = String(result.error);
    const status = code === "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" || code === "OPENCLAW_NOT_CONFIGURED" ? 422 : 502;
    const messageMap: Record<string, string> = {
      TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT: "Task must be assigned to an OpenClaw-backed agent before dispatch.",
      OPENCLAW_NOT_CONFIGURED: "OpenClaw is not configured for this workspace.",
      OPENCLAW_DISPATCH_FAILED: result.message ?? "OpenClaw dispatch failed.",
      OPENCLAW_COMMENT_WRITE_FAILED: result.message ?? "OpenClaw responded, but Mission Control could not write the task comment."
    };
    return error(messageMap[code] ?? "OpenClaw dispatch failed.", status, { code });
  }

  return ok({ dispatch: result }, { status: 201 });
}
