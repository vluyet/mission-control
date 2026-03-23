import type { TaskRecord } from "@/lib/demo-data";

export type AgentRunHealth = {
  bucket: "review" | "blocked" | "fresh" | "aging" | "stale" | "idle";
  label: string;
  detail: string;
  accentClass: string;
  needsAttention: boolean;
};

function formatDistance(updatedAt?: string) {
  if (!updatedAt) return null;
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(diffMs)) return null;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes <= 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function getAgentRunHealth(task: TaskRecord, latestUpdatedAt?: string): AgentRunHealth {
  const updatedAt = latestUpdatedAt ?? task.updatedAt;
  const diffMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Number.NaN;
  const minutes = Number.isFinite(diffMs) ? Math.max(0, Math.round(diffMs / 60000)) : null;
  const distance = formatDistance(updatedAt);

  if (task.status === "In Review" || (task.status === "Done" && task.assigneeType === "Agent")) {
    return {
      bucket: "review",
      label: task.status === "Done" ? "Completed" : "Ready for review",
      detail: distance
        ? task.status === "Done"
          ? `Agent work is complete · updated ${distance}`
          : `Completed and waiting on human · updated ${distance}`
        : task.status === "Done"
          ? "Agent work is complete"
          : "Completed and waiting on human",
      accentClass: "border-amber-200 bg-amber-50 text-amber-800",
      needsAttention: task.status !== "Done"
    };
  }

  if (task.status === "Blocked") {
    return {
      bucket: "blocked",
      label: "Waiting on human",
      detail: task.blockedReason ?? "Blocked and needs human input before the run can continue.",
      accentClass: "border-rose-200 bg-rose-50 text-rose-800",
      needsAttention: true
    };
  }

  if (task.status === "In Progress") {
    if (minutes === null) {
      return {
        bucket: "aging",
        label: "In progress",
        detail: "Run is active, but no freshness signal is available yet.",
        accentClass: "border-sky-200 bg-sky-50 text-sky-800",
        needsAttention: false
      };
    }
    if (minutes < 10) {
      return {
        bucket: "fresh",
        label: "Updated just now",
        detail: distance ? `Healthy run · latest signal ${distance}` : "Healthy run",
        accentClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
        needsAttention: false
      };
    }
    if (minutes <= 30) {
      return {
        bucket: "aging",
        label: `Quiet for ${minutes}m`,
        detail: "Still in progress, but worth a quick check if more silence continues.",
        accentClass: "border-amber-200 bg-amber-50 text-amber-800",
        needsAttention: false
      };
    }
    return {
      bucket: "stale",
      label: "May be stalled",
      detail: distance ? `No recent progress signal since ${distance}.` : "No recent progress signal.",
      accentClass: "border-rose-200 bg-rose-50 text-rose-800",
      needsAttention: true
    };
  }

  return {
    bucket: "idle",
    label: task.status === "Todo" ? "Ready to dispatch" : "Idle",
    detail: task.status === "Todo" ? "This task is assigned to an agent but has not been dispatched yet." : "No active agent run.",
    accentClass: "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-muted)]",
    needsAttention: false
  };
}
