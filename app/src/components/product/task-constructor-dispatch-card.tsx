"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";

export function TaskConstructorDispatchCard({
  taskId
}: {
  taskId: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSend() {
    if (isSubmitting) {
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
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      window.alert(t("constructorDispatch.detailedFailure"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppButton type="button" tone="primary" onClick={handleSend} disabled={isSubmitting || isPending} className="w-full">
      {isSubmitting || isPending ? t("constructorDispatch.dispatching") : t("constructorDispatch.dispatchToAgent")}
    </AppButton>
  );
}