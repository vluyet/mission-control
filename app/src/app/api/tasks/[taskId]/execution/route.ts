import { error, ok } from "@/lib/api-response";
import { appendExecutionLogInDb, getTaskActivityFromDb, getTaskExecutionFromDb, getTaskResourceFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "execution.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const execution = await getTaskExecutionFromDb(params.taskId);
  const timeline = await getTaskActivityFromDb(params.taskId);

  return ok({
    task_id: params.taskId,
    status: execution.status,
    logs: execution.logs,
    timeline
  });
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "execution.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        line?: string;
      }
    | null;

  if (!body?.line) {
    return error(t("api.missingRequiredField"), 422, { required: ["line"] });
  }

  const log = await appendExecutionLogInDb(
    params.taskId,
    body.line,
    auth.actor.type === "agent"
      ? {
          membershipId: auth.actor.membershipId,
          label: auth.actor.label
        }
      : {
          label: auth.actor.label
        }
  );

  if (!log) {
    return error(t("api.noEligibleAgentForExecution"), 409, { taskId: params.taskId });
  }

  if ("error" in log) {
    return error(t("api.agentNotAllowedToWriteExecutionLogs"), 403, {
      code: log.error
    });
  }

  return ok(
    {
      task_id: params.taskId,
      log
    },
    { status: 201 }
  );
}
