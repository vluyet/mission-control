import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
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
  const t = await getApiT();
  const auth = await resolveApiActor(request, "comments.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
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

function formatQuotedComment(
  comment: TaskCommentRecord,
  t: Awaited<ReturnType<typeof getApiT>>
) {
  const author = comment.author?.trim() || t("api.unknownCommentAuthor");
  const role = comment.role?.trim() || t("api.commentRoleFallback");
  return `${author} (${role}):\n${comment.body.trim()}`;
}

function buildMentionDispatchInstruction(input: {
  taskTitle: string;
  taskDescription: string;
  author: string;
  commentBody: string;
  latestAgentComment?: TaskCommentRecord | null;
  recentComments?: TaskCommentRecord[];
  t: Awaited<ReturnType<typeof getApiT>>;
}) {
  const recentContext = (input.recentComments ?? [])
    .slice(-4)
    .map((comment) => formatQuotedComment(comment, input.t))
    .join("\n\n---\n\n");

  return [
    input.t("commentFollowUpDispatch.intro"),
    input.t("commentFollowUpDispatch.originalTaskTitle", { value: input.taskTitle }),
    input.t("commentFollowUpDispatch.originalRequestedDeliverable", {
      value: input.taskDescription.trim()
    }),
    input.latestAgentComment
      ? input.t("commentFollowUpDispatch.latestAgentDraft", {
          value: input.latestAgentComment.body.trim()
        })
      : null,
    recentContext
      ? input.t("commentFollowUpDispatch.recentTaskComments", { value: recentContext })
      : null,
    input.t("commentFollowUpDispatch.latestHumanFollowUp", {
      author: input.author,
      value: input.commentBody.trim()
    }),
    input.t("commentFollowUpDispatch.treatAsRevision"),
    input.t("commentFollowUpDispatch.useOriginalGoal"),
    input.t("commentFollowUpDispatch.replyWithDeliverable"),
    input.t("commentFollowUpDispatch.missingInfoShort")
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "comments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
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
    return error(t("api.missingRequiredFields"), 422, {
      required: ["author", "role", "tone", "body"]
    });
  }
  if (!body?.body) {
    return error(t("api.missingRequiredFields"), 422, {
      required: ["body"]
    });
  }

  const comment = await createCommentInDb(params.taskId, {
    author: auth.actor.type === "agent" ? auth.actor.label : body.author!,
    role: auth.actor.type === "agent" ? t("api.agentRole") : body.role!,
    tone: auth.actor.type === "agent" ? "agent" : body.tone!,
    body: body.body,
    membershipId: auth.actor.type === "agent" ? auth.actor.membershipId : undefined
  });

  if (!comment) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  if ("error" in comment) {
    return error(t("api.agentNotAllowedToComment"), 403, {
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
        taskTitle: task.task.title ?? t("api.untitledTask"),
        taskDescription: task.task.description?.trim() || body.body.trim(),
        author: authorName,
        commentBody: body.body,
        latestAgentComment,
        recentComments,
        t
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
