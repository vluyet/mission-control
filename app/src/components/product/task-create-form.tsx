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

export function TaskCreateForm({
  projectSlug,
  projectName,
  assignees,
  parentOptions
}: {
  projectSlug: string;
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
      dueDate: String(formData.get("dueDate") ?? "")
    };

    if (!payload.title.trim()) {
      setError("Task title is required.");
      return;
    }

    setError(null);

    const response = await fetch(`/api/projects/${projectSlug}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.data?.task?.id) {
      setError(result?.error?.message ?? "Task could not be created.");
      return;
    }

    startTransition(() => {
      router.push(`/projects/${projectSlug}/tasks/${result.data.task.id}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Create task"
        title={`New task in ${projectName}`}
        description="Keep the task lightweight. The project and workspace already carry most of the context."
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">Title</label>
            <input name="title" className="input-control mt-2" placeholder="Improve review queue handoff" />
          </div>
          <div>
            <label className="section-eyebrow">Description</label>
            <textarea
              name="description"
              className="input-control mt-2 min-h-[180px] resize-none"
              placeholder="Summarize the work clearly without restating the whole project context."
            />
          </div>
          <div>
            <label className="section-eyebrow">Tags</label>
            <input name="tags" className="input-control mt-2" placeholder="UI, Review, Delivery" />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">Status</label>
            <select name="status" defaultValue="todo" className="input-control mt-2">
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">Priority</label>
            <select name="priority" defaultValue="medium" className="input-control mt-2">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">Assignee</label>
            <select name="assigneeId" defaultValue="" className="input-control mt-2">
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
            <select name="parentTaskId" defaultValue="" className="input-control mt-2">
              <option value="">No parent task</option>
              {parentOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="section-eyebrow">Start date</label>
              <input name="startDate" type="date" className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">Due date</label>
              <input name="dueDate" type="date" className="input-control mt-2" />
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
            Assignee options are intentionally limited to active non-viewer project members so task ownership stays scoped to people or agents who can act.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">Status defaults to Todo unless you choose otherwise.</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Creating..." : "Create task"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
