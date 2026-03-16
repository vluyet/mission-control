"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppButton } from "@/components/ui/primitives";

export function TaskOpenClawDispatchButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDispatch() {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/tasks/${taskId}/openclaw/dispatch`, { method: "POST" });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "OpenClaw dispatch failed.");
      return;
    }

    setMessage("Dispatched to OpenClaw.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <AppButton type="button" tone="primary" onClick={handleDispatch} disabled={isPending}>
        {isPending ? "Dispatching..." : "Dispatch to OpenClaw"}
      </AppButton>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
