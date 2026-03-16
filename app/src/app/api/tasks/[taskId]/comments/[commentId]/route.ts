import { error, ok } from "@/lib/api-response";
import { getTaskResourceFromDb, updateCommentInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string; commentId: string } }
) {
  const auth = await resolveApiActor(request, "comments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        body?: string;
      }
    | null;

  if (!body?.body?.trim()) {
    return error("Missing required field", 422, {
      required: ["body"]
    });
  }

  const comment = await updateCommentInDb(params.taskId, params.commentId, body.body.trim());

  if (!comment) {
    return error("Comment not found", 404, {
      taskId: params.taskId,
      commentId: params.commentId
    });
  }

  if ("error" in comment) {
    return error("Only human comments can be edited in this version.", 403, {
      code: comment.error
    });
  }

  return ok({
    task_id: params.taskId,
    comment
  });
}
