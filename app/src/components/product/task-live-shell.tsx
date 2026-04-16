"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

const TERMINAL_REFRESH_WINDOW_MS = 20_000;

function isAgentTask(rawAssigneeType: string) {
  return rawAssigneeType === "Agent";
}

function isActiveAgentTask(rawStatus: string, rawAssigneeType: string) {
  return isAgentTask(rawAssigneeType) && rawStatus === "In Progress";
}

export function TaskLiveShell({
  taskId,
  rawStatus,
  rawAssigneeType,
  assigneeSourceSystem,
  children
}: {
  taskId: string;
  rawStatus: string;
  rawAssigneeType: string;
  assigneeSourceSystem?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
      controllerRef.current?.abort();
      intervalRef.current = null;
      timeoutRef.current = null;
      stopTimeoutRef.current = null;
    };

    if (!isAgentTask(rawAssigneeType)) {
      clearTimers();
      return;
    }

    const shouldKeepRefreshing = isActiveAgentTask(rawStatus, rawAssigneeType) || assigneeSourceSystem === "constructor";

    if (!shouldKeepRefreshing) {
      clearTimers();
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
                  active?: boolean;
                  refresh?: boolean;
                };
              }
            | null;

          if (response.ok && payload?.ok && payload.data?.tracked) {
            if (payload.data.refresh) {
              refresh();
            }

            if (!payload.data.active) {
              if (!stopTimeoutRef.current) {
                stopTimeoutRef.current = window.setTimeout(() => {
                  clearTimers();
                }, TERMINAL_REFRESH_WINDOW_MS);
              }
            } else if (stopTimeoutRef.current) {
              window.clearTimeout(stopTimeoutRef.current);
              stopTimeoutRef.current = null;
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
      clearTimers();
    };
  }, [assigneeSourceSystem, rawAssigneeType, rawStatus, router, startTransition, taskId]);

  return <>{children}</>;
}
