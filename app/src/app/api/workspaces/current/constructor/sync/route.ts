import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { syncActiveWorkspaceConstructorAgentsInDb } from "@/lib/server-data";
import { getApiT } from "@/lib/api-i18n";

export async function POST(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const result = await syncActiveWorkspaceConstructorAgentsInDb();

  if (!result) {
    return error(t("api.workspaceNotFound"), 404, { code: "WORKSPACE_NOT_FOUND" });
  }

  if ("error" in result) {
    if (result.error === "CONSTRUCTOR_SYNC_NOT_CONFIGURED") {
      return error(t("api.constructorSyncNotConfigured"), 409, { code: result.error });
    }

    if (result.error === "CONSTRUCTOR_API_TOKEN_REQUIRED") {
      return error(t("api.constructorApiTokenRequired"), 409, { code: result.error });
    }

    return error(result.message ?? t("api.constructorSyncFailed"), 502, { code: result.error });
  }

  return ok({ integration: result.integration, agents: result.agents });
}
