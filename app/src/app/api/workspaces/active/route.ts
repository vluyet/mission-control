import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { error, ok } from "@/lib/api-response";
import { ACTIVE_WORKSPACE_COOKIE_NAME, getActiveWorkspaceCookieOptions } from "@/lib/workspace-session";

type WorkspaceBody = {
  slug?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WorkspaceBody | null;

  if (!body?.slug) {
    return error("Workspace slug is required.", 400, {
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
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE_NAME, workspace.slug, getActiveWorkspaceCookieOptions());

  return ok({
    workspace
  });
}
