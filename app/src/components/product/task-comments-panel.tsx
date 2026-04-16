"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Comment, TimelineEvent } from "@/lib/demo-data";
import { TaskCommentComposer } from "@/components/product/task-comment-composer";
import { renderTaskCommentBody } from "@/lib/task-comment-markdown";
import { useI18n } from "@/components/product/i18n-provider";

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
  const [activeView, setActiveView] = useState<"comments" | "activity">("comments");
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useI18n();
  const sortedMentions = useMemo(() => Array.from(new Set(mentionSuggestions)).sort((a, b) => a.localeCompare(b)), [mentionSuggestions]);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  function toggleExpandedComment(commentId: string) {
    setExpandedCommentIds((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm(t("taskWorkspace.deleteCommentConfirm"))) return;
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
    <div className="space-y-5 px-5 py-5">
      <div className="flex w-full gap-2 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveView("comments")}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            activeView === "comments"
              ? "border-slate-300 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("taskWorkspace.commentsTab", { count: localComments.length })}
        </button>
        <button
          type="button"
          onClick={() => setActiveView("activity")}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            activeView === "activity"
              ? "border-slate-300 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("taskWorkspace.activityTab", { count: timeline.length })}
        </button>
      </div>

      {activeView === "comments"
        ? localComments.map((comment) => {
            const isEditing = editingCommentId === comment.id;
            const isAgentComment = comment.tone === "agent";
            const isExpanded = expandedCommentIds.has(comment.id);
            const shouldClamp = isAgentComment && comment.body.length > 320 && !isExpanded;
            const renderedBody = shouldClamp ? `${comment.body.slice(0, 320)}...` : comment.body;

            return (
              <article key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${comment.tone === "agent" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                      {comment.author.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                      <p className="text-xs text-slate-500">{comment.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.editedAt ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        {t("taskWorkspace.edited")}
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-500">{comment.time}</span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4">
                    <TaskCommentComposer
                      taskId={taskId}
                      commentId={comment.id}
                      initialBody={comment.body}
                      title={t("taskWorkspace.editCommentTitle")}
                      submitLabel={t("taskWorkspace.saveChanges")}
                      placeholder={t("taskWorkspace.editCommentPlaceholder")}
                      mentionSuggestions={sortedMentions}
                      onSubmitted={upsertComment}
                      onCancel={() => setEditingCommentId(null)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 break-words">
                      {renderTaskCommentBody(renderedBody, sortedMentions, comment.id)}
                    </div>
                    {isAgentComment && comment.body.length > 320 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpandedComment(comment.id)}
                        className="mt-2 text-xs font-medium text-slate-900"
                      >
                        {isExpanded ? t("taskWorkspace.showLess") : t("taskWorkspace.showFullAgentUpdate")}
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
                          {deletingCommentId === comment.id ? t("taskWorkspace.deleting") : t("taskWorkspace.deleteComment")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(comment.id)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          {t("taskWorkspace.editComment")}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            );
          })
        : null}

      {activeView === "comments" && !localComments.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {t("taskWorkspace.noCommentsYet")}
        </div>
      ) : null}

      {activeView === "activity" ? (
        timeline.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="border-b border-slate-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t("taskWorkspace.activityFeed")}
            </div>
            <div className="divide-y divide-slate-800">
              {timeline.map((item, index) => (
                <article key={`${item.taskId}-${item.time}-${index}`} className="px-4 py-3 font-mono text-xs leading-5 text-slate-200">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-slate-500">[{String(index + 1).padStart(2, "0")}]</span>
                    <span className="text-cyan-300">{item.time}</span>
                    <span className="text-emerald-300">{item.label}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-200">{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {t("common.noActivityYet")}
          </div>
        )
      ) : null}

      {activeView === "comments" ? <TaskCommentComposer taskId={taskId} title={t("taskWorkspace.addComment")} mentionSuggestions={sortedMentions} onSubmitted={upsertComment} /> : null}
    </div>
  );
}
