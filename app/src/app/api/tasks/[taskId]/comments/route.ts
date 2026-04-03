import { error, ok } from "@/lib/api-response";
import { createCommentInDb, getTaskCommentsFromDb, getTaskResourceFromDb, triggerGatewayMentionDispatchInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "comments.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  return ok({
    task_id: params.taskId,
    comments: await getTaskCommentsFromDb(params.taskId)
  });
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await resolveApiActor(request, "comments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        author?: string;
        role?: string;
        tone?: "human" | "agent";
        body?: string;
      }
    | null;

  if ((!body?.author || !body?.role || !body?.tone) && auth.actor.type !== "agent") {
    return error("Missing required fields", 422, {
      required: ["author", "role", "tone", "body"]
    });
  }
  if (!body?.body) {
    return error("Missing required fields", 422, {
      required: ["body"]
    });
  }

  const comment = await createCommentInDb(params.taskId, {
    author: auth.actor.type === "agent" ? auth.actor.label : body.author!,
    role: auth.actor.type === "agent" ? "Agent" : body.role!,
    tone: auth.actor.type === "agent" ? "agent" : body.tone!,
    body: body.body,
    membershipId: auth.actor.type === "agent" ? auth.actor.membershipId : undefined
  });

  if (!comment) {
    return error("Task not found", 404, { taskId: params.taskId });
  }

  if ("error" in comment) {
    return error("This agent is not allowed to comment.", 403, {
      code: comment.error
    });
  }

  const mentionDispatch =
    auth.actor.type === "agent"
      ? { triggered: false as const }
      : await triggerGatewayMentionDispatchInDb(params.taskId, {
          commentBody: body.body,
          actorLabel: auth.actor.label,
          missionControlBaseUrl: new URL(request.url).origin
        });

  return ok(
    {
      task_id: params.taskId,
      comment,
      mentionDispatch
    },
    { status: 201 }
  );
}
