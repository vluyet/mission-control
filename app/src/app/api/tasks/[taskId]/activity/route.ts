import { error, ok } from "@/lib/api-response";
import { getTaskActivityFromDb, getTaskResourceFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "activity.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const activity = await getTaskActivityFromDb(params.taskId);

  return ok({
    task_id: params.taskId,
    activity,
    timeline: activity
  });
}
