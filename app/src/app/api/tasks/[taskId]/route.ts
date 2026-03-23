import { error, ok } from "@/lib/api-response";
import { deleteTaskInDb, getTaskResourceFromDb, updateTaskInDb } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "tasks.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getTaskResourceFromDb(params.taskId);

  if (!payload) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok(payload);
}

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "tasks.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
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
        blockedReason?: string | null;
        actorType?: "human" | "agent";
      }
    | null;

  if (!body || Object.keys(body).length === 0) {
    return error("No task updates were provided", 422, {
      code: "EMPTY_UPDATE"
    });
  }

  const updated = await updateTaskInDb(
    params.taskId,
    body,
    auth.actor.type === "agent" ? "agent" : body.actorType ?? "human",
    auth.actor.type === "agent"
      ? {
          membershipId: auth.actor.membershipId,
          label: auth.actor.label,
          scopes: auth.actor.scopes
        }
      : {
          label: auth.actor.label
        }
  );

  if (!updated) {
    logAppEvent("error", "task.update.failed", { taskId: params.taskId, reason: "task_not_found" });
    return error("Task not found", 404, { taskId: params.taskId });
  }

  if ("error" in updated) {
    const code = updated.error as
      | "ASSIGNEE_NOT_IN_PROJECT"
      | "ASSIGNEE_DISABLED"
      | "ASSIGNEE_VIEWER"
      | "ASSIGNEE_OBSERVER"
      | "PARENT_NOT_IN_PROJECT"
      | "PARENT_SELF_REFERENCE"
      | "INVALID_AGENT_STATUS_TRANSITION"
      | "INVALID_HUMAN_STATUS_TRANSITION"
      | "AGENT_PERMISSION_DENIED";
    const errorMap: Record<string, string> = {
      ASSIGNEE_NOT_IN_PROJECT: "Assignee must belong to the project",
      ASSIGNEE_DISABLED: "Disabled agents cannot be assigned",
      ASSIGNEE_VIEWER: "Viewer members cannot own tasks",
      ASSIGNEE_OBSERVER: "Observer project members cannot own tasks",
      PARENT_NOT_IN_PROJECT: "Parent task must belong to the same project",
      PARENT_SELF_REFERENCE: "A task cannot be its own parent",
      INVALID_AGENT_STATUS_TRANSITION: "This transition is not allowed for agent-owned work",
      INVALID_HUMAN_STATUS_TRANSITION: "This transition is not allowed for human operators",
      AGENT_PERMISSION_DENIED: "The assigned agent does not have permission for this task action"
    };

    logAppEvent("warn", "task.update.rejected", { taskId: params.taskId, code });
    return error(errorMap[code] ?? "Task update failed", code === "AGENT_PERMISSION_DENIED" ? 403 : 422, {
      code
    });
  }

  logAppEvent("info", "task.update.succeeded", { taskId: params.taskId });

  return ok({
    task: updated
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "tasks.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const deleted = await deleteTaskInDb(params.taskId);

  if (!deleted) {
    logAppEvent("error", "task.delete.failed", { taskId: params.taskId, reason: "task_not_found" });
    return error("Task not found", 404, { taskId: params.taskId });
  }

  logAppEvent("info", "task.deleted", { taskId: params.taskId });
  return ok({ deleted: true, taskId: params.taskId, projectSlug: deleted.projectSlug });
}
