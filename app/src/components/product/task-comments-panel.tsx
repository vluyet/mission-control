"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Comment, TimelineEvent } from "@/lib/demo-data";
import { TaskCommentComposer } from "@/components/product/task-comment-composer";

function renderMentions(body: string, mentionSuggestions: string[]) {
  if (!mentionSuggestions.length) {
    return body;
  }

  const matches = mentionSuggestions
    .map((name) => ({ name, token: `@${name}` }))
    .filter((item) => body.includes(item.token))
    .sort((a, b) => b.token.length - a.token.length);

  if (!matches.length) {
    return body;
  }

  const nodes: Array<string | JSX.Element> = [];
  let cursor = 0;

  while (cursor < body.length) {
    const next = matches
      .map((item) => ({ ...item, index: body.indexOf(item.token, cursor) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index)[0];

    if (!next) {
      nodes.push(body.slice(cursor));
      break;
    }

    if (next.index > cursor) {
      nodes.push(body.slice(cursor, next.index));
    }

    nodes.push(
      <span key={`${next.token}-${next.index}`} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.78rem] font-medium text-[var(--accent-strong)]">
        {next.token}
      </span>
    );
    cursor = next.index + next.token.length;
  }

  return nodes;
}

export function TaskCommentsPanel({
  taskId,
  comments,
  timeline,
  mentionSuggestions
}: {
  taskId: string;
  comments: Comment[];
  timeline: TimelineEvent[];
  mentionSuggestions: string[];
}) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<"comments" | "timeline">("comments");
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const sortedMentions = useMemo(() => Array.from(new Set(mentionSuggestions)).sort((a, b) => a.localeCompare(b)), [mentionSuggestions]);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  function toggleExpandedComment(commentId: string) {
    setExpandedCommentIds((current) => {
      const next = new Set(current);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setDeletingCommentId(commentId);
    const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" });
    setDeletingCommentId(null);
    if (!response.ok) return;
    setLocalComments((current) => current.filter((comment) => comment.id !== commentId));
    startTransition(() => router.refresh());
  }

  function upsertComment(nextComment: Comment) {
    setLocalComments((current) => {
      const index = current.findIndex((comment) => comment.id === nextComment.id);
      if (index >= 0) {
        const updated = [...current];
        updated[index] = nextComment;
        return updated;
      }

      return [...current, nextComment];
    });

    setEditingCommentId(null);
    setActiveView("comments");
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Panel</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView("comments")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeView === "comments"
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--text-strong)]"
                  : "border-[var(--line-strong)] bg-white text-[var(--text-strong)]"
              }`}
            >
              Comments ({localComments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView("timeline")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeView === "timeline"
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--text-strong)]"
                  : "border-[var(--line-strong)] bg-white text-[var(--text-strong)]"
              }`}
            >
              Timeline ({timeline.length})
            </button>
          </div>
        </div>
      </div>

      {activeView === "comments"
        ? localComments.map((comment) => {
        const isEditing = editingCommentId === comment.id;
        const isAgentComment = comment.tone === "agent";
        const isExpanded = expandedCommentIds.has(comment.id);
        const shouldClamp = isAgentComment && comment.body.length > 320 && !isExpanded;
        const renderedBody = shouldClamp ? `${comment.body.slice(0, 320)}...` : comment.body;

        return (
          <article
            key={comment.id}
            className={`rounded-3xl border p-4 ${
              isAgentComment
                ? "border-[var(--line)] bg-[var(--surface-subtle)]"
                : "border-[var(--line)] bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`avatar-chip ${comment.tone === "agent" ? "avatar-chip-agent" : ""}`}>
                  {comment.author.slice(0, 2)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{comment.author}</p>
                  <p className="text-xs text-[var(--text-dim)]">{comment.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {comment.editedAt ? (
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
                    Edited
                  </span>
                ) : null}
                <span className="text-xs text-[var(--text-dim)]">{comment.time}</span>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-4">
                <TaskCommentComposer
                  taskId={taskId}
                  commentId={comment.id}
                  initialBody={comment.body}
                  title="Edit comment"
                  submitLabel="Save changes"
                  placeholder="Refine the comment without changing the task history model."
                  mentionSuggestions={sortedMentions}
                  onSubmitted={upsertComment}
                  onCancel={() => setEditingCommentId(null)}
                />
              </div>
            ) : (
              <>
                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-muted)]">
                  {renderMentions(renderedBody, sortedMentions)}
                </div>
                {isAgentComment && comment.body.length > 320 ? (
                  <button
                    type="button"
                    onClick={() => toggleExpandedComment(comment.id)}
                    className="mt-2 text-xs font-medium text-[var(--accent-strong)]"
                  >
                    {isExpanded ? "Show less" : "Show full agent update"}
                  </button>
                ) : null}
                {comment.tone === "human" ? (
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id || isPending}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(comment.id)}
                      className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-dim)] transition hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]"
                    >
                      Edit comment
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </article>
        );
      }) : null}

      {activeView === "comments" && !localComments.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          No comments yet.
        </div>
      ) : null}

      {activeView === "timeline" ? (
        timeline.length ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-slate-100">
            <div className="space-y-2 font-mono text-xs leading-6">
              {timeline.map((item, index) => (
                <div key={`${item.taskId}-${item.time}-${index}`} className="break-words text-slate-200">
                  <p>
                    <span className="mr-2 text-slate-500">{String(index + 1).padStart(3, "0")}</span>
                    <span className="mr-2 text-slate-400">[{item.time}]</span>
                    <span className="text-slate-100">{item.label}</span>
                  </p>
                  <p className="pl-14 text-slate-300">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-6 text-center text-sm text-[var(--text-muted)]">
            No timeline events yet.
          </div>
        )
      ) : null}

      {activeView === "comments" ? <TaskCommentComposer taskId={taskId} mentionSuggestions={sortedMentions} onSubmitted={upsertComment} /> : null}
    </div>
  );
}
