"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppButton } from "@/components/ui/primitives";

const OPTIONS = [
  { value: "comment", label: "Comment" },
  { value: "change_status", label: "Change status" },
  { value: "log_execution", label: "Log execution" }
];

export function AgentPermissionsEditor({
  memberId,
  permissions
}: {
  memberId: string;
  permissions: string[];
}) {
  const router = useRouter();
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
      setError("Permissions could not be updated.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">Permissions</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
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
        {error ? <span className="text-xs text-rose-600">{error}</span> : <span className="text-xs text-[var(--text-dim)]">Workspace-level bounds for agent actions.</span>}
        <AppButton tone="secondary" className="px-3 py-2" disabled={isPending} onClick={save}>
          {isPending ? "Saving..." : "Save permissions"}
        </AppButton>
      </div>
    </div>
  );
}
