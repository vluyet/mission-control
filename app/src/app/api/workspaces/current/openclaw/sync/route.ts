import { error, ok } from "@/lib/api-response";
import { syncActiveWorkspaceOpenClawAgentsInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const result = await syncActiveWorkspaceOpenClawAgentsInDb();

  if (!result) {
    return error("Workspace not found.", 404, { code: "WORKSPACE_NOT_FOUND" });
  }

  if ("error" in result) {
    return error(result.message ?? "OpenClaw sync failed.", result.error === "OPENCLAW_NOT_CONFIGURED" ? 422 : 502, {
      code: result.error
    });
  }

  return ok(result);
}
