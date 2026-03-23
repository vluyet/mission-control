import { error, ok } from "@/lib/api-response";
import { deleteProjectInDb, getProjectMembersForUi, updateProjectInDb } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const payload = await getProjectMembersForUi(params.slug);

  if (!payload) {
    return error("Project not found", 404, { slug: params.slug });
  }

  return ok(payload.project);
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        description?: string;
        startDate?: string | null;
        endDate?: string | null;
        visibility?: "workspace" | "project_members";
        status?: "active" | "archived";
      }
    | null;

  const result = await updateProjectInDb(params.slug, {
    name: body?.name,
    description: body?.description,
    startDate: body?.startDate,
    endDate: body?.endDate,
    visibility: body?.visibility,
    status: body?.status
  });

  if (!result) {
    logAppEvent("error", "project.update.failed", { projectSlug: params.slug, reason: "project_not_found" });
    return error("Project not found", 404, { slug: params.slug });
  }

  logAppEvent("info", "project.update.succeeded", { projectSlug: params.slug });
  return ok({ project: result });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const result = await deleteProjectInDb(params.slug);

  if (!result) {
    logAppEvent("error", "project.delete.failed", { projectSlug: params.slug, reason: "project_not_found" });
    return error("Project not found", 404, { slug: params.slug });
  }

  logAppEvent("info", "project.deleted", { projectSlug: params.slug });
  return ok({ deleted: true, slug: params.slug });
}
