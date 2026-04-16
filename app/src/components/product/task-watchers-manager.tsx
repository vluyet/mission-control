"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { WatcherRecord } from "@/lib/demo-data";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton } from "@/components/ui/primitives";

export function TaskWatchersManager({
  taskId,
  watchers,
  availableWatchers
}: {
  taskId: string;
  watchers: WatcherRecord[];
  availableWatchers: WatcherRecord[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>(watchers.map((watcher) => watcher.id));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    setError(null);

    const response = await fetch(`/api/tasks/${taskId}/watchers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipIds: selectedIds })
    });

    if (!response.ok) {
      setError(t("taskWatchers.updateFailed"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <p className="section-eyebrow">{t("taskWatchers.title")}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t("taskWatchers.description")}</p>
      <div className="mt-4 space-y-2">
        {availableWatchers.map((watcher) => {
          const selected = selectedIds.includes(watcher.id);
          return (
            <label key={watcher.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
              <input type="checkbox" checked={selected} onChange={() => toggle(watcher.id)} className="h-4 w-4 rounded border-[var(--line-strong)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-strong)]">{watcher.name}</p>
                <p className="text-xs text-[var(--text-dim)]">{watcher.type}</p>
              </div>
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? <span className="text-xs text-rose-600">{error}</span> : <span className="text-xs text-[var(--text-dim)]">{t("taskWatchers.count", { count: selectedIds.length })}</span>}
        <AppButton tone="secondary" className="px-3 py-2" disabled={isPending} onClick={save}>
          {isPending ? t("taskWatchers.saving") : t("taskWatchers.save")}
        </AppButton>
      </div>
    </div>
  );
}
