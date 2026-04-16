"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type ProjectMemberOption = {
  id: string;
  name: string;
  type: "Human" | "Agent";
  role: string;
  workspaceRole?: string;
  projectRole?: string;
};

export function ProjectMembersForm({
  projectSlug,
  projectName,
  members,
  selectedMemberIds,
  selectedRoles
}: {
  projectSlug: string;
  projectName: string;
  members: ProjectMemberOption[];
  selectedMemberIds: string[];
  selectedRoles: Record<string, string>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedMemberIds);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>(selectedRoles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function setRole(id: string, role: string) {
    setMemberRoles((current) => ({
      ...current,
      [id]: role
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`/api/projects/${projectSlug}/members`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        membershipIds: selectedIds,
        memberRoles
      })
    });

    if (!response.ok) {
      setError(t("projectForms.projectMembersUpdateFailed"));
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
        eyebrow={t("projectForms.membersEyebrow")}
        title={t("projectForms.membersTitle", { name: projectName })}
        description={t("projectForms.membersDescription")}
      />
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div className="grid gap-3 xl:grid-cols-2">
          {members.map((member) => {
            const selected = selectedIds.includes(member.id);

            return (
              <label
                key={member.id}
                className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition ${
                  selected
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--surface-subtle)] hover:border-[var(--line-strong)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(member.id)}
                  className="mt-1 h-4 w-4 rounded border-[var(--line-strong)]"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{member.name}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {member.role} · {member.type === "Human" ? t("projectForms.human") : t("projectForms.agent")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {member.workspaceRole ? (
                      <p className="inline-flex rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-dim)]">
                        {member.workspaceRole}
                      </p>
                    ) : null}
                    {selected ? (
                      <select
                        value={memberRoles[member.id] ?? "member"}
                        onChange={(event) => setRole(member.id, event.target.value)}
                        className="input-control min-w-[150px] bg-white py-2 text-sm"
                      >
                        <option value="lead">{t("projectForms.lead")}</option>
                        <option value="member">{t("projectForms.member")}</option>
                        <option value="observer">{t("projectForms.observer")}</option>
                      </select>
                    ) : null}
                  </div>
                  {selected && memberRoles[member.id] === "observer" ? (
                    <p className="mt-2 text-xs text-[var(--text-dim)]">{t("projectForms.observerHint")}</p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {error ? <span className="text-sm text-rose-600">{error}</span> : <span className="text-sm text-[var(--text-dim)]">{t("projectForms.assignmentsHint")}</span>}
          <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
            {isPending ? t("projectForms.saving") : t("projectForms.saveMembers")}
          </AppButton>
        </div>
      </form>
    </Panel>
  );
}
