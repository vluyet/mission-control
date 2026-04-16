import { error, ok } from "@/lib/api-response";
import { getTaskContextFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "tasks.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getTaskContextFromDb(params.taskId);

  if (!payload) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  return ok(payload);
}
