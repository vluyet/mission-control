"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { PaperclipIcon } from "@/components/ui/icons";
import { AppButton } from "@/components/ui/primitives";
import type { Comment } from "@/lib/demo-data";

export function TaskCommentComposer({
  taskId,
  commentId,
  initialBody = "",
  submitLabel = "Post update",
  title = "Add comment",
  placeholder = "Write an update, request input, or summarize progress.",
  mentionSuggestions = [],
  submitSuccessLabel,
  onSubmitted,
  onCancel
}: {
  taskId: string;
  commentId?: string;
  initialBody?: string;
  submitLabel?: string;
  title?: string;
  placeholder?: string;
  mentionSuggestions?: string[];
  submitSuccessLabel?: string;
  onSubmitted?: (comment: Comment) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDisabled = isSubmitting || isPending;
  const trimmedBody = body.trim();
  const hasMentions = mentionSuggestions.length > 0;

  function insertMention(name: string) {
    if (isDisabled) return;
    setBody((current) => `${current}${current.trim().length ? " " : ""}@${name}`.trimStart());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    if (!trimmedBody) {
      setError("Write a comment before posting.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const response = await fetch(commentId ? `/api/tasks/${taskId}/comments/${commentId}` : `/api/tasks/${taskId}/comments`, {
      method: commentId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        commentId
          ? {
              body: trimmedBody
            }
          : {
              author: "Workspace Owner",
              role: "Owner",
              tone: "human",
              body: trimmedBody
            }
      )
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response || !response.ok) {
      setError(commentId ? "Comment could not be updated." : "Comment could not be posted.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as { comment?: Comment } | null;
    if (payload?.comment) {
      onSubmitted?.(payload.comment);
    }

    setBody(commentId ? body : "");
    setSuccess(submitSuccessLabel ?? (commentId ? "Comment updated." : "Comment posted."));
    onCancel?.();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium text-[var(--text-strong)]">{title}</p>
      <textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (error) setError(null);
          if (success) setSuccess(null);
        }}
        disabled={isDisabled}
        className="mt-3 min-h-[110px] w-full resize-none rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--accent-strong)]"
        placeholder={placeholder}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 font-medium text-[var(--text-dim)]">Supports **bold**, _italic_, `code`, lists, links, and @mentions</span>
        {hasMentions ? <span>Tap a teammate to insert a mention.</span> : null}
      </div>
      {hasMentions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {mentionSuggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => insertMention(name)}
              disabled={isDisabled}
              className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Insert mention for ${name}`}
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] opacity-60">
          <PaperclipIcon className="h-4 w-4" />
          Attach file
        </button>
        <div className="flex items-center gap-3">
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
          {!error && success ? <span className="text-sm text-emerald-700">{success}</span> : null}
          {onCancel ? (
            <AppButton type="button" tone="secondary" onClick={onCancel} disabled={isDisabled}>
              Cancel
            </AppButton>
          ) : null}
          <AppButton type="submit" tone="primary" disabled={isDisabled || !trimmedBody} className={isDisabled ? "opacity-70" : ""}>
            {isDisabled ? (commentId ? "Saving..." : "Posting...") : submitLabel}
          </AppButton>
        </div>
      </div>
    </form>
  );
}
