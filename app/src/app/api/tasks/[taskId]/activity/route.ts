import { error, ok } from "@/lib/api-response";
import { getTaskActivityFromDb, getTaskResourceFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "activity.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok({
    task_id: params.taskId,
    activity: await getTaskActivityFromDb(params.taskId)
  });
}
