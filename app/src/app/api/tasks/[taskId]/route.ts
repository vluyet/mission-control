import { revalidatePath } from "next/cache";
import { error, ok } from "@/lib/api-response";
import { deleteTaskInDb, getTaskResourceFromDb, updateTaskInDb } from "@/lib/server-data";
import { logAppEvent } from "@/lib/logger";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

function revalidateTaskPaths(taskId: string, projectSlug?: string | null) {
  revalidatePath(`/tasks/${taskId}`);

  if (projectSlug) {
    revalidatePath(`/projects/${projectSlug}/tasks/${taskId}`);
    revalidatePath(`/projects/${projectSlug}`);
  }

  revalidatePath("/my-tasks");
  revalidatePath("/queue");
}

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "tasks.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getTaskResourceFromDb(params.taskId);

  if (!payload) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  return ok(payload);
}

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "tasks.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
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
    return error(t("api.noTaskUpdatesProvided"), 422, {
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
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
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
      ASSIGNEE_NOT_IN_PROJECT: t("api.assigneeMustBelongToProject"),
      ASSIGNEE_DISABLED: t("api.disabledAgentsCannotBeAssigned"),
      ASSIGNEE_VIEWER: t("api.viewerMembersCannotOwnTasks"),
      ASSIGNEE_OBSERVER: t("api.observerMembersCannotOwnTasks"),
      PARENT_NOT_IN_PROJECT: t("api.parentTaskMustBelongToSameProject"),
      PARENT_SELF_REFERENCE: t("api.taskCannotBeOwnParent"),
      INVALID_AGENT_STATUS_TRANSITION: t("api.invalidAgentStatusTransition"),
      INVALID_HUMAN_STATUS_TRANSITION: t("api.invalidHumanStatusTransition"),
      AGENT_PERMISSION_DENIED: t("api.assignedAgentPermissionDenied")
    };

    logAppEvent("warn", "task.update.rejected", { taskId: params.taskId, code });
    return error(errorMap[code] ?? t("api.taskUpdateFailed"), code === "AGENT_PERMISSION_DENIED" ? 403 : 422, {
      code
    });
  }

  logAppEvent("info", "task.update.succeeded", { taskId: params.taskId });

  revalidateTaskPaths(params.taskId, task.task.projectSlug);

  return ok({
    task: updated
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "tasks.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const deleted = await deleteTaskInDb(params.taskId);

  if (!deleted) {
    logAppEvent("error", "task.delete.failed", { taskId: params.taskId, reason: "task_not_found" });
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  logAppEvent("info", "task.deleted", { taskId: params.taskId });
  revalidateTaskPaths(params.taskId, deleted.projectSlug);
  return ok({ deleted: true, taskId: params.taskId, projectSlug: deleted.projectSlug });
}
