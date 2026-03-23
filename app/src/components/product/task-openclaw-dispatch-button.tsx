"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AppButton } from "@/components/ui/primitives";

export function TaskOpenClawDispatchButton({ taskId, currentStatus }: { taskId: string; currentStatus?: string }) {
  const router = useRouter();
  const timersRef = useRef<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const alreadyRunning = currentStatus === "In Progress";

  useEffect(() => {
    if (alreadyRunning) {
      setMessage((existing) => existing ?? "Task is already in progress. Live updates will appear below.");
    }
  }, [alreadyRunning]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
      timersRef.current = [];
    };
  }, []);

  function scheduleRefreshBurst() {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [250, 1000, 2500, 5000].map((delay) =>
      window.setTimeout(() => {
        startTransition(() => router.refresh());
      }, delay)
    );
  }

  async function handleDispatch() {
    if (alreadyRunning || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage("Sending task to OpenClaw...");

    try {
      const response = await fetch(`/api/tasks/${taskId}/openclaw/dispatch`, { method: "POST" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(null);
        setError(result?.error?.message ?? "OpenClaw dispatch failed.");
        return;
      }

      setMessage(result?.data?.message ?? "Task accepted by OpenClaw. Refreshing task status...");
      scheduleRefreshBurst();
    } catch {
      setMessage(null);
      setError("OpenClaw dispatch failed. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <AppButton type="button" tone="primary" onClick={handleDispatch} disabled={alreadyRunning || isSubmitting || isPending}>
        {alreadyRunning ? "OpenClaw running" : isSubmitting || isPending ? "Dispatching..." : "Dispatch to OpenClaw"}
      </AppButton>
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
