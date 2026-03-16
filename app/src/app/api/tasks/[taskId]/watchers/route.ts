import { error, ok } from "@/lib/api-response";
import { getTaskResourceFromDb, setTaskWatchersInDb } from "@/lib/server-data";

export async function GET(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok({
    task_id: params.taskId,
    watchers: task.watchers ?? [],
    availableWatchers: task.available_watchers ?? []
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const body = (await request.json().catch(() => null)) as { membershipIds?: string[] } | null;
  const updated = await setTaskWatchersInDb(params.taskId, body?.membershipIds ?? []);

  if (!updated) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok(updated);
}
