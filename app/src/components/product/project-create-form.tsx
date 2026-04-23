"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export function ProjectCreateForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      visibility: String(formData.get("visibility") ?? "workspace")
    };

    if (!payload.name.trim()) {
      setError(t("projectForms.projectNameRequired"));
      return;
    }

    setError(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.data?.project?.slug) {
      setError(t("projectForms.projectCreateFailed"));
      return;
    }

    startTransition(() => {
      router.push(`/projects/${result.data.project.slug}`);
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow={t("projectForms.createEyebrow")}
        title={t("projectForms.createTitle")}
        description={t("projectForms.createDescription")}
      />
      <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">{t("projectForms.projectName")}</label>
            <input name="name" className="input-control mt-2" placeholder={t("projectForms.projectNamePlaceholder")} />
          </div>
          <div>
            <label className="section-eyebrow">{t("projectForms.descriptionLabel")}</label>
            <MarkdownEditor
              name="description"
              className="mt-2"
              minHeight="160px"
              placeholder={t("projectForms.descriptionPlaceholder")}
              ariaLabel={t("projectForms.descriptionLabel")}
            />
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div>
            <label className="section-eyebrow">{t("projectForms.startDate")}</label>
            <input name="startDate" type="date" className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">{t("projectForms.endDate")}</label>
            <input name="endDate" type="date" className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">{t("projectForms.visibility")}</label>
            <select name="visibility" className="input-control mt-2" defaultValue="workspace">
              <option value="workspace">{t("projectForms.visibleToWorkspace")}</option>
              <option value="project_members">{t("projectForms.visibleToProjectMembersOnly")}</option>
            </select>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
            {t("projectForms.createHelper")}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">{t("projectForms.savedToDefaultWorkspace")}</span>}
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? t("projectForms.creating") : t("projectForms.createProject")}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
