"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type ProjectEditValues = {
  slug: string;
  name: string;
  description: string;
  status: "active" | "archived";
  visibility: "workspace" | "project_members";
  startDate: string;
  endDate: string;
};

export function ProjectEditForm({ project }: { project: ProjectEditValues }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      startDate: String(formData.get("startDate") ?? "") || null,
      endDate: String(formData.get("endDate") ?? "") || null,
      visibility: String(formData.get("visibility") ?? "workspace"),
      status: String(formData.get("status") ?? "active")
    };

    if (!payload.name.trim()) {
      setError(t("projectForms.projectNameRequired"));
      return;
    }

    setError(null);

    const response = await fetch(`/api/projects/${project.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setError(t("projectForms.projectUpdateFailed"));
      return;
    }

    startTransition(() => {
      router.push(`/projects/${project.slug}`);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (deleteConfirm.trim().toLowerCase() !== project.name.trim().toLowerCase()) {
      setError(t("projectForms.projectNameConfirmMismatch"));
      return;
    }

    setIsDeleting(true);
    setError(null);

    const response = await fetch(`/api/projects/${project.slug}`, { method: "DELETE" });

    if (!response.ok) {
      setIsDeleting(false);
      setError(t("projectForms.projectDeleteFailed"));
      return;
    }

    startTransition(() => {
      router.push("/projects");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("projectForms.editEyebrow")}
          title={project.name}
          description={t("projectForms.editDescription")}
        />
        <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <div>
              <label className="section-eyebrow">{t("projectForms.projectName")}</label>
              <input name="name" defaultValue={project.name} className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">{t("projectForms.descriptionLabel")}</label>
              <textarea
                name="description"
                defaultValue={project.description}
                className="input-control mt-2 min-h-[160px] resize-none"
                placeholder={t("projectForms.descriptionPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
            <div>
              <label className="section-eyebrow">{t("projectForms.lifecycle")}</label>
              <select name="status" defaultValue={project.status} className="input-control mt-2">
                <option value="active">{t("common.active")}</option>
                <option value="archived">{t("projectForms.archived")}</option>
              </select>
            </div>
            <div>
              <label className="section-eyebrow">{t("projectForms.visibility")}</label>
              <select name="visibility" defaultValue={project.visibility} className="input-control mt-2">
                <option value="workspace">{t("projectForms.visibleToWorkspace")}</option>
                <option value="project_members">{t("projectForms.visibleToProjectMembersOnly")}</option>
              </select>
            </div>
            <div>
              <label className="section-eyebrow">{t("projectForms.startDate")}</label>
              <input name="startDate" type="date" defaultValue={project.startDate} className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">{t("projectForms.endDate")}</label>
              <input name="endDate" type="date" defaultValue={project.endDate} className="input-control mt-2" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {error ? (
                <span className="text-sm text-rose-600">{error}</span>
              ) : (
                <span className="text-sm text-[var(--text-dim)]">{t("projectForms.changesSavedImmediately")}</span>
              )}
              <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
                {isPending ? t("projectForms.saving") : t("projectForms.saveChanges")}
              </AppButton>
            </div>
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">{t("projectForms.dangerZone")}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t("projectForms.deleteProjectDescription")}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={project.name}
              className="input-control flex-1"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-50"
            >
              {isDeleting ? t("projectForms.deleting") : t("projectForms.deleteProject")}
            </button>
          </div>
          {error && deleteConfirm ? (
            <p className="mt-2 text-sm text-rose-600">{error}</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
