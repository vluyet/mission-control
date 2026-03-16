"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { PaperclipIcon } from "@/components/ui/icons";
import { AppButton } from "@/components/ui/primitives";

export function TaskCommentComposer({
  taskId,
  commentId,
  initialBody = "",
  submitLabel = "Post update",
  title = "Add comment",
  placeholder = "Write an update, request input, or summarize progress.",
  mentionSuggestions = [],
  onCancel
}: {
  taskId: string;
  commentId?: string;
  initialBody?: string;
  submitLabel?: string;
  title?: string;
  placeholder?: string;
  mentionSuggestions?: string[];
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function insertMention(name: string) {
    setBody((current) => `${current}${current.trim().length ? " " : ""}@${name}`.trimStart());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      setError("Write a comment before posting.");
      return;
    }

    setError(null);

    const response = await fetch(commentId ? `/api/tasks/${taskId}/comments/${commentId}` : `/api/tasks/${taskId}/comments`, {
      method: commentId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        commentId
          ? {
              body
            }
          : {
              author: "Workspace Owner",
              role: "Owner",
              tone: "human",
              body
            }
      )
    });

    if (!response.ok) {
      setError(commentId ? "Comment could not be updated." : "Comment could not be posted.");
      return;
    }

    setBody(commentId ? body : "");
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
        onChange={(event) => setBody(event.target.value)}
        className="mt-3 min-h-[110px] w-full resize-none rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--accent-strong)]"
        placeholder={placeholder}
      />
      {mentionSuggestions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {mentionSuggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => insertMention(name)}
              className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--text-dim)] transition hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)]"
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <PaperclipIcon className="h-4 w-4" />
          Attach file
        </button>
        <div className="flex items-center gap-3">
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
          {onCancel ? (
            <AppButton type="button" tone="secondary" onClick={onCancel}>
              Cancel
            </AppButton>
          ) : null}
          <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
            {isPending ? (commentId ? "Saving..." : "Posting...") : submitLabel}
          </AppButton>
        </div>
      </div>
    </form>
  );
}
