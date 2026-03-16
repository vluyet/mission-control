"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppButton } from "@/components/ui/primitives";

export function AgentEnabledToggle({
  memberId,
  enabled
}: {
  memberId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    setError(null);

    const response = await fetch(`/api/members/${memberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        enabled: !enabled
      })
    });

    if (!response.ok) {
      setError("Agent state could not be updated.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <AppButton tone={enabled ? "secondary" : "primary"} className="px-3 py-2" disabled={isPending} onClick={handleToggle}>
        {isPending ? "Saving..." : enabled ? "Disable agent" : "Enable agent"}
      </AppButton>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
