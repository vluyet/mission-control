"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

function isActiveAgentTask(status: string, assigneeType: string) {
  return assigneeType === "Agent" && (status === "In Progress" || status === "Blocked");
}

export function TaskLiveShell({
  taskId: _taskId,
  status,
  assigneeType,
  children
}: {
  taskId: string;
  status: string;
  assigneeType: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActiveAgentTask(status, assigneeType)) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
      return;
    }

    const refresh = () => startTransition(() => router.refresh());
    refresh();
    timeoutRef.current = window.setTimeout(refresh, 1500);
    intervalRef.current = window.setInterval(refresh, 5000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
    };
  }, [assigneeType, router, startTransition, status]);

  return <>{children}</>;
}
