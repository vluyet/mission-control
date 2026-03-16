import { error, ok } from "@/lib/api-response";
import { createProjectInDb } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";

export async function POST(request: Request) {
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
    return error("Missing required fields", 422, {
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
    return error("Workspace not found", 404);
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
