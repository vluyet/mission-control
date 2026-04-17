"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useLayoutEffect, useRef, useState, useTransition } from "react";
import { PaperclipIcon } from "@/components/ui/icons";
import { AppButton } from "@/components/ui/primitives";
import { useI18n } from "@/components/product/i18n-provider";
import type { Comment } from "@/lib/demo-data";
import { renderTaskCommentEditorHighlight } from "@/lib/task-comment-markdown";

const MIN_EDITOR_HEIGHT = 110;
const MAX_EDITOR_HEIGHT = 320;

export function TaskCommentComposer({
  taskId,
  commentId,
  initialBody = "",
  submitLabel,
  title,
  placeholder,
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
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDisabled = isSubmitting || isPending;
  const trimmedBody = body.trim();
  const hasMentions = mentionSuggestions.length > 0;

  function syncEditorLayout(target?: HTMLTextAreaElement | null) {
    const textarea = target ?? textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_EDITOR_HEIGHT), MAX_EDITOR_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_EDITOR_HEIGHT ? "auto" : "hidden";
    syncOverlayScroll(textarea);
  }

  function syncOverlayScroll(target?: HTMLTextAreaElement | null) {
    if (!overlayRef.current) return;
    const textarea = target ?? textareaRef.current;

    if (!textarea) return;

    overlayRef.current.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
  }

  useLayoutEffect(() => {
    syncEditorLayout();
  }, [body]);

  function insertMention(name: string) {
    if (isDisabled) return;
    setBody((current) => `${current}${current.trim().length ? " " : ""}@${name}`.trimStart());
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
      syncEditorLayout(textareaRef.current);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    if (!trimmedBody) {
      setError(t("taskWorkspace.writeCommentBeforePosting"));
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
              author: t("taskAttachments.workspaceOwner"),
              role: t("common.owner"),
              tone: "human",
              body: trimmedBody
            }
      )
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response || !response.ok) {
      setError(commentId ? t("taskWorkspace.commentUpdateFailed") : t("taskWorkspace.commentPostFailed"));
      return;
    }

    const payload = (await response.json().catch(() => null)) as { comment?: Comment } | null;
    if (payload?.comment) {
      onSubmitted?.(payload.comment);
    }

    setBody(commentId ? body : "");
    setSuccess(submitSuccessLabel ?? (commentId ? t("taskWorkspace.commentUpdated") : t("taskWorkspace.commentPosted")));
    onCancel?.();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium text-[var(--text-strong)]">{title ?? t("taskWorkspace.addComment")}</p>
      <div className="mt-3 relative min-h-[110px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition focus-within:border-[var(--accent-strong)]">
        {body ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              ref={overlayRef}
              className="px-4 py-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-strong)]"
              data-testid="task-comment-editor-overlay"
            >
              {renderTaskCommentEditorHighlight(body, mentionSuggestions, commentId ?? `${taskId}-draft-overlay`)}
            </div>
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
            if (success) setSuccess(null);
          }}
          onInput={(event) => syncEditorLayout(event.currentTarget)}
          onScroll={(event) => syncOverlayScroll(event.currentTarget)}
          disabled={isDisabled}
          className={`relative z-10 min-h-[110px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--text-dim)] selection:bg-[var(--focus)] ${body ? "text-transparent caret-[var(--text-strong)]" : "text-[var(--text-strong)]"}`}
          placeholder={placeholder ?? t("taskWorkspace.addCommentPlaceholder")}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 font-medium text-[var(--text-dim)]">{t("taskWorkspace.formattingHint")}</span>
        {hasMentions ? <span>{t("taskWorkspace.mentionHint")}</span> : null}
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
              aria-label={t("taskWorkspace.insertMentionAria", { name })}
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] opacity-60">
          <PaperclipIcon className="h-4 w-4" />
          {t("taskWorkspace.attachFile")}
        </button>
        <div className="flex items-center gap-3">
          {error ? <span className="text-sm text-rose-600">{error}</span> : null}
          {!error && success ? <span className="text-sm text-emerald-700">{success}</span> : null}
          {onCancel ? (
            <AppButton type="button" tone="secondary" onClick={onCancel} disabled={isDisabled}>
              {t("taskWorkspace.cancel")}
            </AppButton>
          ) : null}
          <AppButton type="submit" tone="primary" disabled={isDisabled || !trimmedBody} className={isDisabled ? "opacity-70" : ""}>
            {isDisabled ? (commentId ? t("taskWorkspace.saving") : t("taskWorkspace.posting")) : (submitLabel ?? t("taskWorkspace.postUpdate"))}
          </AppButton>
        </div>
      </div>
    </form>
  );
}
