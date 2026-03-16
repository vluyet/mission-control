import { ok } from "@/lib/api-response";
import { getWorkspaceContextFromDb } from "@/lib/server-data";
import { error } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request, "workspaces.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getWorkspaceContextFromDb();

  if (!payload) {
    return error("Workspace not found", 404);
  }

  return ok(payload);
}
