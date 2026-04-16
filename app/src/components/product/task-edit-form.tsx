"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
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
  projectSlug,
  assignees,
  parentOptions
}: {
  task: TaskEditValues;
  projectName: string;
  projectSlug: string;
  assignees: AssigneeOption[];
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      setError(t("taskForms.taskTitleRequired"));
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
      setError(payload?.error?.message ?? t("taskForms.taskUpdateFailed"));
      return;
    }

    startTransition(() => {
      router.push(`/tasks/${task.id}`);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!window.confirm(t("taskForms.deleteTaskConfirm", { id: task.id }))) return;
    setIsDeleting(true);
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!response.ok) {
      setIsDeleting(false);
      setError(t("taskForms.taskDeleteFailed"));
      return;
    }
    startTransition(() => {
      router.push(`/projects/${projectSlug}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow={t("taskForms.editEyebrow")}
        title={t("taskForms.editTitle", { id: task.id })}
        description={t("taskForms.editDescription", { name: projectName })}
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">{t("taskForms.title")}</label>
            <input name="title" defaultValue={task.title} className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.descriptionLabel")}</label>
            <textarea
              name="description"
              defaultValue={task.description}
              className="input-control mt-2 min-h-[180px] resize-none"
            />
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.blockedReason")}</label>
            <input
              name="blockedReason"
              defaultValue={task.blockedReason}
              className="input-control mt-2"
              placeholder={t("taskForms.blockedReasonPlaceholder")}
            />
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.tags")}</label>
            <input
              name="tags"
              defaultValue={task.tags}
              className="input-control mt-2"
              placeholder={t("taskForms.tagsPlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">{t("taskForms.status")}</label>
            <select name="status" defaultValue={task.status} className="input-control mt-2">
              <option value="todo">{t("taskForms.todo")}</option>
              <option value="in_progress">{t("taskForms.inProgress")}</option>
              <option value="review">{t("taskForms.inReview")}</option>
              <option value="blocked">{t("taskForms.blocked")}</option>
              <option value="done">{t("taskForms.done")}</option>
            </select>
            <p className="mt-2 text-xs text-[var(--text-dim)]">{t("taskForms.statusHint")}</p>
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.priority")}</label>
            <select name="priority" defaultValue={task.priority} className="input-control mt-2">
              <option value="low">{t("taskForms.low")}</option>
              <option value="medium">{t("taskForms.medium")}</option>
              <option value="high">{t("taskForms.high")}</option>
              <option value="urgent">{t("taskForms.urgent")}</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.assignee")}</label>
            <select name="assigneeId" defaultValue={task.assigneeId} className="input-control mt-2">
              <option value="">{t("taskForms.unassigned")}</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.parentTask")}</label>
            <select name="parentTaskId" defaultValue={task.parentTaskId} className="input-control mt-2">
              <option value="">{t("taskForms.noParentTask")}</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="section-eyebrow">{t("taskForms.startDate")}</label>
              <input name="startDate" type="date" defaultValue={task.startDate} className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">{t("taskForms.dueDate")}</label>
              <input name="dueDate" type="date" defaultValue={task.dueDate} className="input-control mt-2" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">{t("taskForms.activityHint")}</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? t("taskForms.saving") : t("taskForms.saveChanges")}
            </AppButton>
          </div>
          <div className="border-t border-[var(--line)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">{t("taskForms.dangerZone")}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{t("taskForms.deleteTaskDescription")}</p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="mt-3 inline-flex items-center rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50"
            >
              {isDeleting ? t("taskForms.deleting") : t("taskForms.deleteTask")}
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
