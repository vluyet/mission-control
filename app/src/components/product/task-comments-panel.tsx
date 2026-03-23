"use client";

import { useMemo, useState } from "react";
import type { Comment } from "@/lib/demo-data";
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
  mentionSuggestions
}: {
  taskId: string;
  comments: Comment[];
  mentionSuggestions: string[];
}) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const sortedMentions = useMemo(() => Array.from(new Set(mentionSuggestions)).sort((a, b) => a.localeCompare(b)), [mentionSuggestions]);

  return (
    <div className="space-y-4 px-5 py-4">
      {comments.map((comment) => {
        const isEditing = editingCommentId === comment.id;

        return (
          <article key={comment.id} className="rounded-3xl border border-[var(--line)] bg-white p-4">
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
                  onCancel={() => setEditingCommentId(null)}
                />
              </div>
            ) : (
              <>
                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-muted)]">
                  {renderMentions(comment.body, sortedMentions)}
                </div>
                {comment.tone === "human" ? (
                  <div className="mt-4 flex justify-end">
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
      })}

      <TaskCommentComposer taskId={taskId} mentionSuggestions={sortedMentions} />
    </div>
  );
}
