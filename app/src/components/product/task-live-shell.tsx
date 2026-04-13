"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

function isActiveAgentTask(status: string, assigneeType: string) {
  return assigneeType === "Agent" && status === "In Progress";
}

export function TaskLiveShell({
  taskId,
  status,
  assigneeType,
  assigneeSourceSystem,
  children
}: {
  taskId: string;
  status: string;
  assigneeType: string;
  assigneeSourceSystem?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isActiveAgentTask(status, assigneeType)) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      controllerRef.current?.abort();
      intervalRef.current = null;
      timeoutRef.current = null;
      return;
    }

    const refresh = () => startTransition(() => router.refresh());
    const sync = async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        if (assigneeSourceSystem === "constructor") {
          const response = await fetch(`/api/tasks/${taskId}/constructor/status`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                ok?: boolean;
                data?: {
                  tracked?: boolean;
                  refresh?: boolean;
                };
              }
            | null;

          if (response.ok && payload?.ok && payload.data?.tracked) {
            if (payload.data.refresh) {
              refresh();
            }
            return;
          }
        }

        refresh();
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        refresh();
      }
    };

    void sync();
    timeoutRef.current = window.setTimeout(() => {
      void sync();
    }, 1500);
    intervalRef.current = window.setInterval(() => {
      void sync();
    }, 5000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      controllerRef.current?.abort();
      intervalRef.current = null;
      timeoutRef.current = null;
    };
  }, [assigneeSourceSystem, assigneeType, router, startTransition, status, taskId]);

  return <>{children}</>;
}
