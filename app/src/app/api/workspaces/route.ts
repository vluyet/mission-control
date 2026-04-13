import { cookies } from "next/headers";
import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { createWorkspaceInDb, getWorkspaceShellDataForUi } from "@/lib/server-data";
import { ACTIVE_WORKSPACE_COOKIE_NAME, getActiveWorkspaceCookieOptions } from "@/lib/workspace-session";

type CreateWorkspaceBody = {
  name?: string;
  visibility?: "personal" | "shared";
};

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const data = await getWorkspaceShellDataForUi();
  return ok(data ?? { currentWorkspace: null, workspaces: [] });
}

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as CreateWorkspaceBody | null;

  if (!body?.name?.trim()) {
    return error("Workspace name is required.", 422, { code: "WORKSPACE_NAME_REQUIRED" });
  }

  const workspace = await createWorkspaceInDb({
    name: body.name,
    visibility: body.visibility
  });

  if (!workspace) {
    return error("Workspace could not be created.", 500, { code: "WORKSPACE_CREATE_FAILED" });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE_NAME, workspace.slug, getActiveWorkspaceCookieOptions());

  return ok({ workspace }, { status: 201 });
}
