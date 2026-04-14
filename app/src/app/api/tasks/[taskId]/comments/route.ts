import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import {
  dispatchMissionControlTaskToConstructor,
  getLatestConstructorSession
} from "@/app/api/tasks/[taskId]/constructor/dispatch/route";
import {
  appendSystemExecutionLogInDb,
  createCommentInDb,
  getTaskCommentsFromDb,
  getTaskResourceFromDb
} from "@/lib/server-data";

type TaskCommentRecord = Awaited<ReturnType<typeof getTaskCommentsFromDb>>[number];

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

function extractMentionNames(body: string) {
  return Array.from(
    new Set(
      Array.from(body.matchAll(/(^|\s)@([A-Za-z0-9][A-Za-z0-9._:-]*)/g))
        .map((match) => match[2]?.trim())
        .filter(Boolean)
    )
  );
}

function formatQuotedComment(comment: TaskCommentRecord) {
  const author = comment.author?.trim() || "Unknown";
  const role = comment.role?.trim() || "Comment";
  return `${author} (${role}):\n${comment.body.trim()}`;
}

function buildMentionDispatchInstruction(input: {
  taskTitle: string;
  taskDescription: string;
  author: string;
  commentBody: string;
  latestAgentComment?: TaskCommentRecord | null;
  recentComments?: TaskCommentRecord[];
}) {
  const recentContext = (input.recentComments ?? [])
    .slice(-4)
    .map((comment) => formatQuotedComment(comment))
    .join("\n\n---\n\n");

  return [
    "You are continuing an existing Mission Control task after a new human follow-up comment.",
    `Original task title: ${input.taskTitle}`,
    `Original requested deliverable:\n${input.taskDescription.trim()}`,
    input.latestAgentComment
      ? `Latest agent draft/output to revise:\n${input.latestAgentComment.body.trim()}`
      : null,
    recentContext ? `Recent task comments:\n${recentContext}` : null,
    `Latest human follow-up from ${input.author}:\n${input.commentBody.trim()}`,
    "Treat the human comment as feedback or a revision request on the existing task, not as a brand new blank request.",
    "Use the original task goal and the latest draft/output above to produce the revised final answer directly.",
    "Reply with the improved deliverable itself so Mission Control can post it as the next task comment.",
    "If something important is genuinely missing, say exactly what is missing in one short sentence."
  ]
    .filter(Boolean)
    .join("\n\n");
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

  const mentionNames = extractMentionNames(body.body);
  const taskComments = mentionNames.length ? await getTaskCommentsFromDb(params.taskId) : [];
  const latestSession = mentionNames.length ? await getLatestConstructorSession(params.taskId) : null;
  let mentionDispatch:
    | { triggered: false }
    | {
        triggered: true;
        accepted: boolean;
        sessionId: string | null;
        externalTaskId: string | null;
        idempotencyKey: string | null;
        target: string[];
      }
    | {
        triggered: true;
        accepted: false;
        target: string[];
        code?: string;
        message: string;
      } = { triggered: false };

  if (mentionNames.length) {
    const authorName = auth.actor.type === "agent" ? auth.actor.label : body.author!;
    const latestAgentComment = [...taskComments].reverse().find((entry) => entry.tone === "agent") ?? null;
    const recentComments = taskComments.slice(-5);
    const dispatchResult = await dispatchMissionControlTaskToConstructor({
      requestUrl: request.url,
      taskId: params.taskId,
      instruction: buildMentionDispatchInstruction({
        taskTitle: task.task.title ?? "Untitled task",
        taskDescription: task.task.description?.trim() || body.body.trim(),
        author: authorName,
        commentBody: body.body,
        latestAgentComment,
        recentComments
      }),
      sessionId: latestSession?.sessionId ?? null,
      externalTaskId: `mc-task-${params.taskId}-comment-${comment.id}`,
      idempotencyKey: `mc-task-${params.taskId}-comment-${comment.id}`,
      metadata: {
        origin: "mission-control-comment-mention",
        trigger: "task-comment-mention",
        commentId: comment.id,
        mentionedAgents: mentionNames,
        commentAuthor: authorName
      },
      routingHints: {
        reason: "comment-mention-follow-up"
      }
    });

    if (dispatchResult.ok) {
      mentionDispatch = {
        triggered: true,
        accepted: true,
        sessionId: dispatchResult.body.dispatch.sessionId ?? null,
        externalTaskId: dispatchResult.body.dispatch.externalTaskId ?? null,
        idempotencyKey: dispatchResult.body.dispatch.idempotencyKey ?? null,
        target: mentionNames
      };
    } else {
      mentionDispatch = {
        triggered: true,
        accepted: false,
        target: mentionNames,
        code: typeof dispatchResult.details?.code === "string" ? dispatchResult.details.code : undefined,
        message: dispatchResult.message
      };

      await appendSystemExecutionLogInDb(
        params.taskId,
        `CONSTRUCTOR_MENTION_DISPATCH_FAILED commentId=${comment.id} target=${mentionNames.join(",")} reason=${dispatchResult.message.replace(/\s+/g, "_")}`,
        "Constructor"
      );
    }
  }

  return ok(
    {
      task_id: params.taskId,
      comment,
      mentionDispatch
    },
    { status: 201 }
  );
}
