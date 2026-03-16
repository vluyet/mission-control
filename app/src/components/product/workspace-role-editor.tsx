"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" }
] as const;

function normalizeRole(role?: string) {
  switch (role?.toLowerCase()) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "viewer":
      return "viewer";
    default:
      return "member";
  }
}

export function WorkspaceRoleEditor({
  memberId,
  role
}: {
  memberId: string;
  role?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(normalizeRole(role));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleChange(nextRole: string) {
    setSelected(nextRole);
    setError(null);

    const response = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ workspaceRole: nextRole })
    });

    if (!response.ok) {
      setError("Role could not be updated.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-dim)]">Workspace role</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              disabled={isPending}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-[var(--text-dim)]">
        {error ? <span className="text-rose-600">{error}</span> : <span>Viewers stay visible but are removed from task ownership.</span>}
      </div>
    </div>
  );
}
