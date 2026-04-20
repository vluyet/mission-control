"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function TaskConstructorDispatchCard({
  taskId,
  rawStatus,
  assigneeSourceSystem
}: {
  taskId: string;
  rawStatus?: string | null;
  assigneeSourceSystem?: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunActive, setIsRunActive] = useState(
    assigneeSourceSystem === "constructor" && normalizeStatus(rawStatus) === "in_progress"
  );

  useEffect(() => {
    setIsRunActive(assigneeSourceSystem === "constructor" && normalizeStatus(rawStatus) === "in_progress");
  }, [assigneeSourceSystem, rawStatus]);

  useEffect(() => {
    if (!isRunActive) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const syncStatus = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/constructor/status`, {
          method: "GET",
          cache: "no-store"
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

        if (cancelled || !response.ok || !payload?.ok || !payload.data) {
          return;
        }

        if (payload.data.refresh) {
          startTransition(() => {
            router.refresh();
          });
        }

        if (payload.data.tracked) {
          setIsRunActive(Boolean(payload.data.active));
        }
      } catch {
        if (cancelled) {
          return;
        }
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(() => {
            void syncStatus();
          }, 5000);
        }
      }
    };

    void syncStatus();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isRunActive, router, startTransition, taskId]);

  async function handleSend() {
    if (isSubmitting || isRunActive || isPending) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/constructor/dispatch`, {
        method: "POST"
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        window.alert(payload?.error?.message ?? t("constructorDispatch.genericFailure"));
        setIsRunActive(false);
        return;
      }

      setIsRunActive(true);
      startTransition(() => router.refresh());
    } catch {
      setIsRunActive(false);
      window.alert(t("constructorDispatch.detailedFailure"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppButton type="button" tone="primary" onClick={handleSend} disabled={isSubmitting || isPending || isRunActive} className="w-full">
      {isSubmitting || isPending || isRunActive ? t("constructorDispatch.dispatching") : t("constructorDispatch.dispatchToAgent")}
    </AppButton>
  );
}