import { cookies } from "next/headers";
import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { deleteWorkspaceInDb } from "@/lib/server-data";
import { ACTIVE_WORKSPACE_COOKIE_NAME, getActiveWorkspaceCookieOptions } from "@/lib/workspace-session";
import { getApiT } from "@/lib/api-i18n";

export async function DELETE(request: Request, { params }: { params: { slug: string } }) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const result = await deleteWorkspaceInDb(params.slug);

  if ("error" in result) {
    if (result.error === "WORKSPACE_NOT_FOUND") {
      return error(t("api.workspaceNotFound"), 404, { code: result.error });
    }

    if (result.error === "LAST_WORKSPACE") {
      return error(t("api.createAnotherWorkspaceBeforeDeletingLast"), 422, { code: result.error });
    }

    return error(t("api.workspaceDeleteFailed"), 400, { code: result.error });
  }

  if (result.fallbackWorkspace) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE_NAME, result.fallbackWorkspace.slug, getActiveWorkspaceCookieOptions());
  }

  return ok(result);
}
