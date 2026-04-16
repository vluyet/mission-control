import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { ACTIVE_WORKSPACE_COOKIE_NAME, getActiveWorkspaceCookieOptions } from "@/lib/workspace-session";
import { getApiT } from "@/lib/api-i18n";

type WorkspaceBody = {
  slug?: string;
};

export async function POST(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const body = (await request.json().catch(() => null)) as WorkspaceBody | null;

  if (!body?.slug) {
    return error(t("api.workspaceSlugRequired"), 400, {
      code: "WORKSPACE_REQUIRED"
    });
  }

  const workspace = await db.workspace.findFirst({
    where: { slug: body.slug },
    select: {
      slug: true,
      name: true
    }
  });

  if (!workspace) {
    return error(t("api.workspaceNotFound"), 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE_NAME, workspace.slug, getActiveWorkspaceCookieOptions());

  return ok({
    workspace
  });
}
