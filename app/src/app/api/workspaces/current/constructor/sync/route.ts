import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { syncActiveWorkspaceConstructorAgentsInDb } from "@/lib/server-data";

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const result = await syncActiveWorkspaceConstructorAgentsInDb();

  if (!result) {
    return error("Workspace not found.", 404, { code: "WORKSPACE_NOT_FOUND" });
  }

  if ("error" in result) {
    if (result.error === "CONSTRUCTOR_SYNC_NOT_CONFIGURED") {
      return error("Constructor agent sync is not configured for this workspace.", 409, { code: result.error });
    }

    if (result.error === "CONSTRUCTOR_API_TOKEN_REQUIRED") {
      return error("Constructor API token is required before syncing agents.", 409, { code: result.error });
    }

    return error(result.message ?? "Constructor agent sync failed.", 502, { code: result.error });
  }

  return ok({ integration: result.integration, agents: result.agents });
}
