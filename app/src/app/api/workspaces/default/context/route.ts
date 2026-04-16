import { ok } from "@/lib/api-response";
import { getWorkspaceContextFromDb } from "@/lib/server-data";
import { error } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function GET(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "workspaces.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getWorkspaceContextFromDb();

  if (!payload) {
    return error(t("api.workspaceNotFound"), 404);
  }

  return ok(payload);
}
