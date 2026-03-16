import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { syncWorkspaceOpenClawAgentsInDb } from "@/lib/server-data";

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const result = await syncWorkspaceOpenClawAgentsInDb();

  if (!result) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  if ("error" in result) {
    const status =
      result.error === "OPENCLAW_NOT_CONFIGURED"
        ? 404
        : result.error === "OPENCLAW_DISABLED"
          ? 422
          : 422;

    return error(result.message ?? "OpenClaw sync failed.", status, {
      code: result.error
    });
  }

  return ok(result);
}
