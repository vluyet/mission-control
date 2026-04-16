"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";

type TransitionOption = {
  value: "todo" | "in_progress" | "review" | "blocked" | "done";
  label: string;
};

export function TaskStatusActions({
  taskId,
  currentStatus,
  rawStatus,
  blockedReason,
  options,
  actorType = "agent",
  title,
  description,
  hideHeader = false
}: {
  taskId: string;
  currentStatus: string;
  rawStatus?: string;
  blockedReason?: string;
  options: TransitionOption[];
  actorType?: "human" | "agent";
  title?: string;
  description?: string;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedStatus = (rawStatus ?? currentStatus).toLowerCase();
  const stateAwareDescription =
    description ??
    (actorType === "agent"
      ? normalizedStatus.includes("review")
        ? t("taskStatus.agentReviewDescription")
        : normalizedStatus.includes("progress")
          ? t("taskStatus.agentInProgressDescription")
          : normalizedStatus.includes("blocked")
            ? t("taskStatus.agentBlockedDescription")
            : t("taskStatus.agentCurrentStateDescription", { status: currentStatus })
      : normalizedStatus.includes("review")
        ? t("taskStatus.humanReviewDescription")
        : normalizedStatus.includes("blocked")
          ? t("taskStatus.humanBlockedDescription")
          : t("taskStatus.humanCurrentStateDescription", { status: currentStatus }));

  async function handleTransition(nextStatus: TransitionOption["value"]) {
    setError(null);

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: nextStatus,
        actorType,
        blockedReason: nextStatus === "blocked" ? blockedReason ?? t("taskStatus.blockedPendingFollowUp") : blockedReason ?? ""
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? t("taskStatus.transitionFailed"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      {hideHeader ? null : <p className="section-eyebrow">{title ?? (actorType === "agent" ? t("taskStatus.agentWorkflow") : t("taskStatus.humanWorkflow"))}</p>}
      {hideHeader ? null : <p className="mt-2 text-sm text-[var(--text-muted)]">{stateAwareDescription}</p>}
      <div className={`${hideHeader ? "flex flex-col gap-2" : "mt-4 flex flex-wrap gap-2"}`}>
        {options.length ? (
          options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTransition(option.value)}
              disabled={isPending}
              className={`rounded-xl border px-3 py-2 text-sm transition disabled:opacity-60 ${
                hideHeader
                  ? index === 0
                    ? "w-full border-slate-900 bg-slate-900 text-white hover:opacity-90"
                    : "w-full border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  : index === 0
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white hover:opacity-90"
                    : "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
              }`}
            >
              {isPending ? t("taskStatus.updating") : option.label}
            </button>
          ))
        ) : (
          <span className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-dim)]">{t("taskStatus.noFurtherTransitionsAvailable")}</span>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
