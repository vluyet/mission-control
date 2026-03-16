import type { TaskRecord } from "@/lib/demo-data";

export type TaskViewState = {
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

  return {
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
    if (view.status && task.status.toLowerCase().replace(/\s+/g, "-") !== view.status) {
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

      return new Date(task.dueAt).getTime() < now.getTime() && task.status !== "Done";
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

export function getTagOptions(items: TaskRecord[]) {
  return Array.from(new Set(items.flatMap((task) => task.tags))).sort((left, right) => left.localeCompare(right));
}
