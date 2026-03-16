import { error, ok } from "@/lib/api-response";
import { getTaskContextFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "tasks.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getTaskContextFromDb(params.taskId);

  if (!payload) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok(payload);
}
