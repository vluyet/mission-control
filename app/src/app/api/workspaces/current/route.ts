import { error, ok } from "@/lib/api-response";
import { getWorkspaceManagementDataForUi, updateActiveWorkspaceInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const payload = await getWorkspaceManagementDataForUi();

  if (!payload) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok(payload);
}

export async function PATCH(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        visibility?: "personal" | "shared";
        contextTitle?: string;
        contextSummary?: string;
        contextBullets?: string[];
      }
    | null;

  if (!body?.name?.trim()) {
    return error("Workspace name is required.", 422, {
      code: "WORKSPACE_NAME_REQUIRED"
    });
  }

  const workspace = await updateActiveWorkspaceInDb({
    name: body.name,
    visibility: body.visibility,
    contextTitle: body.contextTitle,
    contextSummary: body.contextSummary,
    contextBullets: body.contextBullets
  });

  if (!workspace) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    workspace
  });
}
