"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

export function ProjectGovernanceForm({
  projectSlug,
  projectName,
  initialStatus,
  initialVisibility
}: {
  projectSlug: string;
  projectName: string;
  initialStatus: "active" | "archived";
  initialVisibility: "workspace" | "project_members";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [status, setStatus] = useState(initialStatus);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/projects/${projectSlug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        visibility
      })
    });

    if (!response.ok) {
      setError(t("projectForms.governanceUpdateFailed"));
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
        eyebrow={t("projectForms.governanceEyebrow")}
        title={t("projectForms.governanceTitle", { name: projectName })}
        description={t("projectForms.governanceDescription")}
      />
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div className="space-y-4">
          <div>
            <label className="section-eyebrow">{t("projectForms.visibility")}</label>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as "workspace" | "project_members")} className="input-control mt-2">
              <option value="workspace">{t("projectForms.visibleToWorkspace")}</option>
              <option value="project_members">{t("projectForms.visibleToProjectMembersOnly")}</option>
            </select>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {t("projectForms.visibilityHint")}
            </p>
          </div>

          <div>
            <label className="section-eyebrow">{t("projectForms.lifecycle")}</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as "active" | "archived")} className="input-control mt-2">
              <option value="active">{t("common.active")}</option>
              <option value="archived">{t("projectForms.archived")}</option>
            </select>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {t("projectForms.lifecycleHint")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm leading-7 text-[var(--text-muted)]">
          {t("projectForms.governanceHelper")}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">{t("projectForms.governanceIdleHint")}</span>}
          <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
            {isPending ? t("projectForms.saving") : t("projectForms.saveSettings")}
          </AppButton>
        </div>
      </form>
    </Panel>
  );
}
