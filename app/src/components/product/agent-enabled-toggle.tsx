"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";

export function AgentEnabledToggle({
  memberId,
  enabled
}: {
  memberId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
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
      setError(t("memberAgents.agentStateUpdateFailed"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <AppButton tone={enabled ? "secondary" : "primary"} className="px-3 py-2" disabled={isPending} onClick={handleToggle}>
        {isPending ? t("memberAgents.saving") : enabled ? t("memberAgents.disableAgent") : t("memberAgents.enableAgent")}
      </AppButton>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
