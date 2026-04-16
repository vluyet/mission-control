import type { TaskRecord } from "@/lib/demo-data";

type StatusKey = "todo" | "inProgress" | "inReview" | "blocked" | "done";

type BoardColumnLabels = Record<StatusKey, string>;

function toStatusSlug(status: TaskRecord["status"] | string) {
  switch (status) {
    case "In Progress":
      return "in-progress";
    case "In Review":
      return "review";
    case "Blocked":
      return "blocked";
    case "Done":
      return "done";
    default:
      return "todo";
  }
}

export type TaskViewState = {
  mode: "list" | "board";
  status: string;
  timing: string;
  sort: string;
  tag: string;
};

export function parseTaskViewState(searchParams?: Record<string, string | string[] | undefined>): TaskViewState {
  const read = (key: keyof TaskViewState) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  const mode = read("mode");

  return {
    mode: mode === "board" ? "board" : "list",
    status: read("status"),
    timing: read("timing"),
    sort: read("sort") || "due",
    tag: read("tag")
  };
}

function priorityWeight(priority: TaskRecord["priority"]) {
  return priority === "Urgent" ? 4 : priority === "High" ? 3 : priority === "Medium" ? 2 : 1;
}

export function applyTaskView(items: TaskRecord[], view: TaskViewState) {
  const now = new Date();
  const filtered = items.filter((task) => {
    const statusForLogic = task.rawStatus ?? task.status;

    if (view.status && toStatusSlug(statusForLogic) !== view.status) {
      return false;
    }

    if (view.tag && !task.tags.includes(view.tag)) {
      return false;
    }

    if (view.timing === "due-soon") {
      if (!task.dueAt) {
        return false;
      }

      const due = new Date(task.dueAt);
      const diff = due.getTime() - now.getTime();
      return diff >= 0 && diff <= 2 * 86400000;
    }

    if (view.timing === "overdue") {
      if (!task.dueAt) {
        return false;
      }

      return new Date(task.dueAt).getTime() < now.getTime() && (task.rawStatus ?? task.status) !== "Done";
    }

    return true;
  });

  return filtered.sort((left, right) => {
    if (view.sort === "priority") {
      return priorityWeight(right.priority) - priorityWeight(left.priority);
    }

    if (view.sort === "updated") {
      return new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime();
    }

    if (view.sort === "created") {
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    }

    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

export function getTaskStatusKey(status: TaskRecord["status"] | string): StatusKey {
  switch (status) {
    case "In Progress":
      return "inProgress";
    case "In Review":
      return "inReview";
    case "Blocked":
      return "blocked";
    case "Done":
      return "done";
    default:
      return "todo";
  }
}

export function buildBoardColumns(items: TaskRecord[], labels?: Partial<BoardColumnLabels>) {
  const base = [
    { title: labels?.todo ?? "Todo", statusKey: "todo", accent: "slate" },
    { title: labels?.inProgress ?? "In Progress", statusKey: "inProgress", accent: "blue" },
    { title: labels?.inReview ?? "In Review", statusKey: "inReview", accent: "gold" },
    { title: labels?.blocked ?? "Blocked", statusKey: "blocked", accent: "red" },
    { title: labels?.done ?? "Done", statusKey: "done", accent: "emerald" }
  ] as const;

  return base.map((column) => {
    const cards = items
      .filter((item) => getTaskStatusKey(item.rawStatus ?? item.status) === column.statusKey)
      .map((item) => ({
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        priority: item.priority,
        eta: item.due,
        effort: item.effort,
        project: item.project,
        tags: item.tags,
        childCount: item.childCount,
        parentTaskTitle: item.parentTaskTitle ?? null
      }));

    return {
      title: column.title,
      statusKey: column.statusKey,
      count: cards.length,
      accent: column.accent,
      cards
    };
  });
}

export function getTagOptions(items: TaskRecord[]) {
  return Array.from(new Set(items.flatMap((task) => task.tags))).sort((left, right) => left.localeCompare(right));
}
