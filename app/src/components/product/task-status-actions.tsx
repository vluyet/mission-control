"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
type TransitionOption = {
  value: "todo" | "in_progress" | "review" | "blocked" | "done";
  label: string;
};

export function TaskStatusActions({
  taskId,
  currentStatus,
  blockedReason,
  options,
  actorType = "agent",
  title,
  description,
  hideHeader = false
}: {
  taskId: string;
  currentStatus: string;
  blockedReason?: string;
  options: TransitionOption[];
  actorType?: "human" | "agent";
  title?: string;
  description?: string;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedStatus = currentStatus.toLowerCase();
  const stateAwareDescription =
    description ??
    (actorType === "agent"
      ? normalizedStatus.includes("review")
        ? "The run is finished. Keep the next step human: approve it, send it back for another pass, or mark it blocked if the outcome is incomplete."
        : normalizedStatus.includes("progress")
          ? "The run is active. Only intervene if you need to add context, redirect the work, or mark a blocker."
          : normalizedStatus.includes("blocked")
            ? "The run is blocked. Add the missing context or move the task into the state that best reflects the next safe step."
            : `Current state: ${currentStatus}. Use the constrained workflow below to keep agent execution predictable.`
      : normalizedStatus.includes("review")
        ? "A decision is needed now. Approve the result, request changes, or move it into a clearer human-owned state."
        : normalizedStatus.includes("blocked")
          ? "Resolve the blocker first, then move the task forward deliberately."
          : `Current state: ${currentStatus}. Human operators can move work intentionally without bypassing the shared workflow model.`);

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
        blockedReason: nextStatus === "blocked" ? blockedReason ?? "Blocked pending follow-up." : blockedReason ?? ""
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Status transition failed.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      {hideHeader ? null : <p className="section-eyebrow">{title ?? (actorType === "agent" ? "Agent workflow" : "Human workflow")}</p>}
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
              {isPending ? "Updating..." : option.label}
            </button>
          ))
        ) : (
          <span className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--text-dim)]">No further transitions available.</span>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
