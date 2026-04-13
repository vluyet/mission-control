import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { moveProjectToWorkspaceInDb } from "@/lib/server-data";

type MoveProjectBody = {
  projectSlug?: string;
  targetWorkspaceSlug?: string;
};

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as MoveProjectBody | null;

  if (!body?.projectSlug || !body?.targetWorkspaceSlug) {
    return error("Project and target workspace are required.", 422, { code: "MOVE_FIELDS_REQUIRED" });
  }

  const result = await moveProjectToWorkspaceInDb(body.projectSlug, body.targetWorkspaceSlug);

  if ("error" in result) {
    if (result.error === "PROJECT_NOT_FOUND") {
      return error("Project not found.", 404, { code: result.error });
    }

    if (result.error === "TARGET_WORKSPACE_NOT_FOUND") {
      return error("Target workspace not found.", 404, { code: result.error });
    }

    if (result.error === "TARGET_WORKSPACE_SAME") {
      return error("Choose a different workspace.", 422, { code: result.error });
    }

    return error("Project move failed.", 400, { code: result.error });
  }

  return ok(result);
}
