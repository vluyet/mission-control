import { error, ok } from "@/lib/api-response";
import { deleteCommentInDb, getTaskResourceFromDb, updateCommentInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string; commentId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "comments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        body?: string;
      }
    | null;

  if (!body?.body?.trim()) {
    return error(t("api.missingRequiredField"), 422, {
      required: ["body"]
    });
  }

  const comment = await updateCommentInDb(params.taskId, params.commentId, body.body.trim());

  if (!comment) {
    return error(t("api.commentNotFound"), 404, {
      taskId: params.taskId,
      commentId: params.commentId
    });
  }

  if ("error" in comment) {
    return error(t("api.onlyHumanCommentsEditable"), 403, {
      code: comment.error
    });
  }

  return ok({
    task_id: params.taskId,
    comment
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string; commentId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "comments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const result = await deleteCommentInDb(params.taskId, params.commentId);

  if (!result) {
    return error(t("api.commentNotFound"), 404, { taskId: params.taskId, commentId: params.commentId });
  }

  if ("error" in result) {
    return error(t("api.agentCommentsCannotBeDeleted"), 403, { code: result.error });
  }

  return ok({ deleted: true, taskId: params.taskId, commentId: params.commentId });
}
