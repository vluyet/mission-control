"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
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
  const { t } = useI18n();
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
      setError(t("taskForms.taskTitleRequired"));
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
      setError(result?.error?.message ?? t("taskForms.taskCreateFailed"));
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
        eyebrow={t("taskForms.createEyebrow")}
        title={t("taskForms.createTitle", { name: projectName })}
        description={t("taskForms.createDescription")}
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">{t("taskForms.title")}</label>
            <input name="title" className="input-control mt-2" placeholder={t("taskForms.titlePlaceholder")} />
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.descriptionLabel")}</label>
            <MarkdownEditor
              name="description"
              className="mt-2"
              minHeight="180px"
              placeholder={t("taskForms.descriptionPlaceholder")}
              ariaLabel={t("taskForms.descriptionLabel")}
            />
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.tags")}</label>
            <input name="tags" className="input-control mt-2" placeholder={t("taskForms.tagsPlaceholder")} />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">{t("taskForms.status")}</label>
            <select name="status" defaultValue="todo" className="input-control mt-2">
              <option value="todo">{t("taskForms.todo")}</option>
              <option value="in_progress">{t("taskForms.inProgress")}</option>
              <option value="review">{t("taskForms.inReview")}</option>
              <option value="blocked">{t("taskForms.blocked")}</option>
              <option value="done">{t("taskForms.done")}</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.priority")}</label>
            <select name="priority" defaultValue="medium" className="input-control mt-2">
              <option value="low">{t("taskForms.low")}</option>
              <option value="medium">{t("taskForms.medium")}</option>
              <option value="high">{t("taskForms.high")}</option>
              <option value="urgent">{t("taskForms.urgent")}</option>
            </select>
          </div>
          <div>
            <label className="section-eyebrow">{t("taskForms.assignee")}</label>
            <select name="assigneeId" defaultValue="" className="input-control mt-2">
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
            <select name="parentTaskId" defaultValue="" className="input-control mt-2">
              <option value="">{t("taskForms.noParentTask")}</option>
              {parentOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="section-eyebrow">{t("taskForms.startDate")}</label>
              <input name="startDate" type="date" className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">{t("taskForms.dueDate")}</label>
              <input name="dueDate" type="date" className="input-control mt-2" />
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
            {t("taskForms.assigneeHint")}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">{t("taskForms.defaultStatusHint")}</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? t("taskForms.creating") : t("taskForms.createTask")}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
