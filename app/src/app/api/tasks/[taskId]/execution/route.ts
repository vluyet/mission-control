import { error, ok } from "@/lib/api-response";
import { appendExecutionLogInDb, getTaskActivityFromDb, getTaskExecutionFromDb, getTaskResourceFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "execution.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
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
  const auth = await resolveApiActor(request, "execution.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        line?: string;
      }
    | null;

  if (!body?.line) {
    return error("Missing required field", 422, { required: ["line"] });
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
    return error("No eligible agent available for execution", 409, { taskId: params.taskId });
  }

  if ("error" in log) {
    return error("This agent is not allowed to write execution logs.", 403, {
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
