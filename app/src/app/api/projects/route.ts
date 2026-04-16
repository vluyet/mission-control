import { error, ok } from "@/lib/api-response";
import { createProjectInDb } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

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

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        visibility?: "workspace" | "project_members";
      }
    | null;

  if (!body?.name?.trim()) {
    return error(t("api.missingRequiredFields"), 422, {
      required: ["name"]
    });
  }

  const project = await createProjectInDb({
    name: body.name,
    description: body.description,
    startDate: body.startDate,
    endDate: body.endDate,
    visibility: body.visibility
  });

  if (!project) {
    logAppEvent("error", "project.create.failed", { reason: "workspace_not_found" });
    return error(t("api.workspaceNotFound"), 404);
  }

  logAppEvent("info", "project.create.succeeded", {
    projectSlug: project.slug
  });

  return ok(
    {
      project
    },
    { status: 201 }
  );
}
