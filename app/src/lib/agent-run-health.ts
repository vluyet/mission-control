import type { TaskRecord } from "@/lib/demo-data";
import { createTranslator } from "@/lib/i18n/translator";
import { en } from "@/lib/i18n/messages/en";
import type { Messages } from "@/lib/i18n/messages";

export type AgentRunHealth = {
  bucket: "review" | "blocked" | "fresh" | "aging" | "stale" | "idle";
  label: string;
  detail: string;
  accentClass: string;
  needsAttention: boolean;
};

function formatDistance(updatedAt?: string, t: (key: string, params?: Record<string, string | number | boolean>) => string = createTranslator(en)) {
  if (!updatedAt) return null;
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(diffMs)) return null;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes <= 1) return t("agentRunHealth.justNow");
  if (minutes < 60) return t("agentRunHealth.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("agentRunHealth.hoursAgo", { count: hours });
  return t("agentRunHealth.daysAgo", { count: Math.round(hours / 24) });
}

export function getAgentRunHealth(
  task: TaskRecord,
  latestUpdatedAt?: string,
  t: (key: string, params?: Record<string, string | number | boolean>) => string = createTranslator(en)
): AgentRunHealth {
  const updatedAt = latestUpdatedAt ?? task.updatedAt;
  const diffMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Number.NaN;
  const minutes = Number.isFinite(diffMs) ? Math.max(0, Math.round(diffMs / 60000)) : null;
  const distance = formatDistance(updatedAt, t);

  if (task.status === "In Review" || (task.status === "Done" && task.assigneeType === "Agent")) {
    return {
      bucket: "review",
      label: task.status === "Done" ? t("agentRunHealth.completed") : t("agentRunHealth.readyForReview"),
      detail: distance
        ? task.status === "Done"
          ? t("agentRunHealth.agentWorkCompleteUpdated", { distance })
          : t("agentRunHealth.completedWaitingOnHumanUpdated", { distance })
        : task.status === "Done"
          ? t("agentRunHealth.agentWorkComplete")
          : t("agentRunHealth.completedWaitingOnHuman"),
      accentClass: "border-amber-200 bg-amber-50 text-amber-800",
      needsAttention: task.status !== "Done"
    };
  }

  if (task.status === "Blocked") {
    return {
      bucket: "blocked",
      label: t("agentRunHealth.waitingOnHuman"),
      detail: task.blockedReason ?? t("agentRunHealth.blockedNeedsHumanInput"),
      accentClass: "border-rose-200 bg-rose-50 text-rose-800",
      needsAttention: true
    };
  }

  if (task.status === "In Progress") {
    if (minutes === null) {
      return {
        bucket: "aging",
        label: t("agentRunHealth.inProgress"),
        detail: t("agentRunHealth.noFreshnessSignal"),
        accentClass: "border-sky-200 bg-sky-50 text-sky-800",
        needsAttention: false
      };
    }
    if (minutes < 10) {
      return {
        bucket: "fresh",
        label: t("agentRunHealth.updatedJustNow"),
        detail: distance ? t("agentRunHealth.healthyRunLatestSignal", { distance }) : t("agentRunHealth.healthyRun"),
        accentClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
        needsAttention: false
      };
    }
    if (minutes <= 30) {
      return {
        bucket: "aging",
        label: t("agentRunHealth.quietForMinutes", { count: minutes }),
        detail: t("agentRunHealth.stillInProgressWorthChecking"),
        accentClass: "border-amber-200 bg-amber-50 text-amber-800",
        needsAttention: false
      };
    }
    return {
      bucket: "stale",
      label: t("agentRunHealth.mayBeStalled"),
      detail: distance ? t("agentRunHealth.noRecentProgressSince", { distance }) : t("agentRunHealth.noRecentProgress"),
      accentClass: "border-rose-200 bg-rose-50 text-rose-800",
      needsAttention: true
    };
  }

  return {
    bucket: "idle",
    label: task.status === "Todo" ? t("agentRunHealth.readyToDispatch") : t("agentRunHealth.idle"),
    detail: task.status === "Todo" ? t("agentRunHealth.assignedNotDispatched") : t("agentRunHealth.noActiveRun"),
    accentClass: "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-muted)]",
    needsAttention: false
  };
}
