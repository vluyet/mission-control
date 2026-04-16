import { error, ok } from "@/lib/api-response";
import { getApiT } from "@/lib/api-i18n";
import { updateAgentPermissionsInDb, updateMemberEnabledInDb, updateWorkspaceRoleInDb } from "@/lib/server-data";

export async function PATCH(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  const t = await getApiT();
  const body = (await request.json().catch(() => null)) as
    | { enabled?: boolean; agentPermissions?: string[]; workspaceRole?: "owner" | "admin" | "member" | "viewer" }
    | null;

  if (typeof body?.enabled !== "boolean" && !Array.isArray(body?.agentPermissions) && typeof body?.workspaceRole !== "string") {
    return error(t("api.memberUpdatePatchRequired"), 422, {
      code: "PATCH_REQUIRED"
    });
  }
  let updated:
    | Awaited<ReturnType<typeof updateMemberEnabledInDb>>
    | Awaited<ReturnType<typeof updateAgentPermissionsInDb>>
    | Awaited<ReturnType<typeof updateWorkspaceRoleInDb>>
    | null = null;

  if (typeof body?.enabled === "boolean") {
    updated = await updateMemberEnabledInDb(params.memberId, body.enabled);
  }

  if (typeof body?.workspaceRole === "string") {
    updated = await updateWorkspaceRoleInDb(params.memberId, body.workspaceRole);
  }

  if (Array.isArray(body?.agentPermissions)) {
    updated = await updateAgentPermissionsInDb(params.memberId, body.agentPermissions);
  }

  if (!updated) {
    return error(t("api.memberNotFound"), 404, { memberId: params.memberId });
  }

  if ("error" in updated) {
    return error(t("api.memberUpdateNotAllowed"), 422, {
      code: updated.error
    });
  }

  return ok({
    member: updated
  });
}
