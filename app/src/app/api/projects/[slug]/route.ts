import { error, ok } from "@/lib/api-response";
import { getProjectMembersForUi, updateProjectGovernanceInDb } from "@/lib/server-data";
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
        visibility?: "workspace" | "project_members";
        status?: "active" | "archived";
      }
    | null;

  const result = await updateProjectGovernanceInDb(params.slug, {
    visibility: body?.visibility,
    status: body?.status
  });

  if (!result) {
    logAppEvent("error", "project.governance.failed", { projectSlug: params.slug, reason: "project_not_found" });
    return error("Project not found", 404, { slug: params.slug });
  }

  logAppEvent("info", "project.governance.updated", {
    projectSlug: params.slug,
    status: result.status,
    visibility: result.visibility
  });

  return ok({
    project: result
  });
}
