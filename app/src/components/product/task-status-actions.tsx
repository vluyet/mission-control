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
  description
}: {
  taskId: string;
  currentStatus: string;
  blockedReason?: string;
  options: TransitionOption[];
  actorType?: "human" | "agent";
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      <p className="section-eyebrow">{title ?? (actorType === "agent" ? "Agent workflow" : "Human workflow")}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {description ??
          (actorType === "agent"
            ? `Current state: ${currentStatus}. Use the constrained workflow below to keep agent execution predictable.`
            : `Current state: ${currentStatus}. Human operators can move work intentionally without bypassing the shared workflow model.`)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.length ? (
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTransition(option.value)}
              disabled={isPending}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--text-strong)] disabled:opacity-60"
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
