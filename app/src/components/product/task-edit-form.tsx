"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type AssigneeOption = {
  id: string;
  name: string;
  label: string;
};

type ParentOption = {
  id: string;
  label: string;
};

type TaskEditValues = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: string;
  parentTaskId: string;
  tags: string;
  startDate: string;
  dueDate: string;
  blockedReason: string;
};

export function TaskEditForm({
  task,
  projectName,
  assignees,
  parentOptions
}: {
  task: TaskEditValues;
  projectName: string;
  assignees: AssigneeOption[];
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: String(formData.get("status") ?? "todo"),
      priority: String(formData.get("priority") ?? "medium"),
      assigneeId: String(formData.get("assigneeId") ?? ""),
      parentTaskId: String(formData.get("parentTaskId") ?? ""),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      startDate: String(formData.get("startDate") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      blockedReason: String(formData.get("blockedReason") ?? "")
    };

    if (!payload.title.trim()) {
      setError("Task title is required.");
      return;
    }

    setError(null);

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Task could not be updated.");
      return;
    }

    startTransition(() => {
      router.push(`/tasks/${task.id}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Edit task"
        title={`Update ${task.id}`}
        description={`Keep ${projectName} moving without overcomplicating the workflow.`}
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">Title</label>
            <input name="title" defaultValue={task.title} className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">Description</label>
            <textarea
              name="description"
              defaultValue={task.description}
              className="input-control mt-2 min-h-[180px] resize-none"
            />
          </div>
          <div>
            <label className="section-eyebrow">Blocked reason</label>
            <input
              name="blockedReason"
              defaultValue={task.blockedReason}
              className="input-control mt-2"
              placeholder="Only needed if the task is blocked."
            />
          </div>
          <div>
            <label className="section-eyebrow">Tags</label>
            <input
              name="tags"
              defaultValue={task.tags}
              className="input-control mt-2"
              placeholder="UI, Review, Delivery"
            />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">Status</label>
            <select name="status" defaultValue={task.status} className="input-control mt-2">
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
            <p className="mt-2 text-xs text-[var(--text-dim)]">Status changes are now actor-aware: human and agent workflows follow different allowed transitions.</p>
          </div>
          <div>
            <label className="section-eyebrow">Priority</label>
            <select name="priority" defaultValue={task.priority} className="input-control mt-2">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">Assignee</label>
            <select name="assigneeId" defaultValue={task.assigneeId} className="input-control mt-2">
              <option value="">Unassigned</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-eyebrow">Parent task</label>
            <select name="parentTaskId" defaultValue={task.parentTaskId} className="input-control mt-2">
              <option value="">No parent task</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="section-eyebrow">Start date</label>
              <input name="startDate" type="date" defaultValue={task.startDate} className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">Due date</label>
              <input name="dueDate" type="date" defaultValue={task.dueDate} className="input-control mt-2" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">Task changes are recorded in activity.</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Saving..." : "Save changes"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
