import { error, ok } from "@/lib/api-response";
import { createTaskInDb, getProjectWorkspaceForUi } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const project = await getProjectWorkspaceForUi(params.slug);

  if (!project) {
    return error("Project not found", 404, { slug: params.slug });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        description?: string;
        status?: "todo" | "in_progress" | "review" | "blocked" | "done";
        priority?: "low" | "medium" | "high" | "urgent";
        assigneeId?: string | null;
        parentTaskId?: string | null;
        tags?: string[];
        startDate?: string | null;
        dueDate?: string | null;
      }
    | null;

  if (!body?.title?.trim()) {
    return error("Missing required fields", 422, {
      required: ["title"]
    });
  }

  const created = await createTaskInDb(params.slug, {
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    assigneeId: body.assigneeId,
    parentTaskId: body.parentTaskId,
    tags: body.tags,
    startDate: body.startDate,
    dueDate: body.dueDate
  });

  if (!created) {
    logAppEvent("error", "task.create.failed", { projectSlug: params.slug, reason: "project_not_found" });
    return error("Project not found", 404, { slug: params.slug });
  }

  if ("error" in created) {
    const code = created.error as "ASSIGNEE_NOT_IN_PROJECT" | "ASSIGNEE_DISABLED" | "ASSIGNEE_VIEWER" | "ASSIGNEE_OBSERVER" | "PROJECT_ARCHIVED" | "PARENT_NOT_IN_PROJECT";
    const errorMap: Record<string, string> = {
      ASSIGNEE_NOT_IN_PROJECT: "Assignee must belong to the project",
      ASSIGNEE_DISABLED: "Disabled agents cannot be assigned",
      ASSIGNEE_VIEWER: "Viewer members cannot own tasks",
      ASSIGNEE_OBSERVER: "Observer project members cannot own tasks",
      PROJECT_ARCHIVED: "Archived projects cannot accept new tasks",
      PARENT_NOT_IN_PROJECT: "Parent task must belong to the same project"
    };

    logAppEvent("warn", "task.create.rejected", { projectSlug: params.slug, code });
    return error(errorMap[code] ?? "Task creation failed", 422, {
      code
    });
  }

  logAppEvent("info", "task.create.succeeded", {
    projectSlug: params.slug,
    taskId: created.id
  });

  return ok(
    {
      task: created
    },
    { status: 201 }
  );
}
