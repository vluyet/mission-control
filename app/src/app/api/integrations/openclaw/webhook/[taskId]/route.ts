import { error, ok } from "@/lib/api-response";
import { handleOpenClawTaskWebhookInDb } from "@/lib/server-data";

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  const expected = process.env.OPENCLAW_WEBHOOK_TOKEN?.trim();
  if (expected) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${expected}`) {
      return error("Unauthorized webhook.", 401, { code: "WEBHOOK_UNAUTHORIZED" });
    }
  }

  const payload = await request.json().catch(() => null);
  const result = await handleOpenClawTaskWebhookInDb(params.taskId, payload);

  if ("error" in result) {
    const statusMap: Record<string, number> = {
      TASK_NOT_FOUND: 404,
      TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT: 422,
      NO_FINAL_TEXT: 422,
      OPENCLAW_COMMENT_WRITE_FAILED: 502
    };

    return error("OpenClaw webhook could not be processed.", statusMap[String(result.error)] ?? 400, {
      code: result.error
    });
  }

  return ok({ accepted: true, commentId: result.commentId });
}
