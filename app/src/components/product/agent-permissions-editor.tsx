"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";

export function AgentPermissionsEditor({
  memberId,
  permissions
}: {
  memberId: string;
  permissions: string[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const options = [
    { value: "comment", label: t("memberAgents.permissionComment") },
    { value: "change_status", label: t("memberAgents.permissionChangeStatus") },
    { value: "log_execution", label: t("memberAgents.permissionLogExecution") }
  ];
  const [selected, setSelected] = useState<string[]>(permissions);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(permission: string) {
    setSelected((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]));
  }

  async function save() {
    setError(null);
    const response = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentPermissions: selected })
    });

    if (!response.ok) {
      setError(t("memberAgents.permissionsUpdateFailed"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">{t("memberAgents.permissions")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-dim)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? <span className="text-xs text-rose-600">{error}</span> : <span className="text-xs text-[var(--text-dim)]">{t("memberAgents.workspaceBoundsHint")}</span>}
        <AppButton tone="secondary" className="px-3 py-2" disabled={isPending} onClick={save}>
          {isPending ? t("memberAgents.saving") : t("memberAgents.savePermissions")}
        </AppButton>
      </div>
    </div>
  );
}
