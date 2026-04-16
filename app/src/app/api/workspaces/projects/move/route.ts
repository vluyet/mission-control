import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { moveProjectToWorkspaceInDb } from "@/lib/server-data";
import { getApiT } from "@/lib/api-i18n";

type MoveProjectBody = {
  projectSlug?: string;
  targetWorkspaceSlug?: string;
};

export async function POST(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as MoveProjectBody | null;

  if (!body?.projectSlug || !body?.targetWorkspaceSlug) {
    return error(t("api.projectAndTargetWorkspaceRequired"), 422, { code: "MOVE_FIELDS_REQUIRED" });
  }

  const result = await moveProjectToWorkspaceInDb(body.projectSlug, body.targetWorkspaceSlug);

  if ("error" in result) {
    if (result.error === "PROJECT_NOT_FOUND") {
      return error(t("api.projectNotFound"), 404, { code: result.error });
    }

    if (result.error === "TARGET_WORKSPACE_NOT_FOUND") {
      return error(t("api.targetWorkspaceNotFound"), 404, { code: result.error });
    }

    if (result.error === "TARGET_WORKSPACE_SAME") {
      return error(t("api.chooseDifferentWorkspace"), 422, { code: result.error });
    }

    return error(t("api.projectMoveFailed"), 400, { code: result.error });
  }

  return ok(result);
}
