"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookIcon, PlusIcon } from "@/components/ui/icons";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton, Panel } from "@/components/ui/primitives";

type TaskViewState = {
  mode: "list" | "board";
  status: string;
  timing: string;
  sort: string;
  tag: string;
};

type SavedView = TaskViewState & {
  id: string;
  label: string;
};

function buildHref(
  basePath: string,
  current: TaskViewState,
  preservedParams: Record<string, string> = {}
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(preservedParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(current)) {
    if (value && !(key === "mode" && value === "list")) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function SavedTaskViews({
  storageKey,
  basePath,
  current,
  preservedParams = {},
  compact = false
}: {
  storageKey: string;
  basePath: string;
  current: TaskViewState;
  preservedParams?: Record<string, string>;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedView[];
      setSavedViews(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedViews([]);
    }
  }, [storageKey]);

  function persist(next: SavedView[]) {
    setSavedViews(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function saveCurrent() {
    const label = window.prompt(t("savedTaskViews.promptName"));
    if (!label?.trim()) {
      return;
    }

    const next: SavedView[] = [
      {
        id: `${Date.now()}`,
        label: label.trim(),
        ...current
      },
      ...savedViews
    ].slice(0, 6);

    persist(next);
  }

  const canSave = useMemo(
    () => Boolean(current.mode !== "list" || current.status || current.timing || current.tag || current.sort !== "due"),
    [current]
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
          <span className="text-[var(--text-muted)]">
            <BookIcon className="h-3.5 w-3.5" />
          </span>
          <span>{t("savedTaskViews.views")}</span>
        </div>
        <AppButton tone="secondary" onClick={saveCurrent} disabled={!canSave} className="h-8 rounded-full px-3 py-0 text-xs">
          <PlusIcon className="h-3.5 w-3.5" />
          {t("savedTaskViews.save")}
        </AppButton>
        {savedViews.map((view) => (
          <div key={view.id} className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 text-xs text-[var(--text-strong)]">
            <button
              type="button"
              onClick={() => router.push(buildHref(basePath, view, preservedParams))}
              className="font-medium"
            >
              {view.label}
            </button>
            <button
              type="button"
              onClick={() => persist(savedViews.filter((item) => item.id !== view.id))}
              className="text-[var(--text-dim)] hover:text-[var(--text-strong)]"
              aria-label={t("savedTaskViews.removeAria", { label: view.label })}
            >
              {t("savedTaskViews.remove")}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-eyebrow">{t("savedTaskViews.title")}</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("savedTaskViews.description")}</p>
        </div>
        <AppButton tone="secondary" onClick={saveCurrent} disabled={!canSave}>
          {t("savedTaskViews.saveCurrent")}
        </AppButton>
      </div>
      {savedViews.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <div key={view.id} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2">
              <button
                type="button"
                onClick={() => router.push(buildHref(basePath, view, preservedParams))}
                className="text-sm font-medium text-[var(--text-strong)]"
              >
                {view.label}
              </button>
              <button
                type="button"
                onClick={() => persist(savedViews.filter((item) => item.id !== view.id))}
                className="text-xs text-[var(--text-dim)]"
              >
                {t("savedTaskViews.remove")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-dim)]">{t("savedTaskViews.empty")}</p>
      )}
    </Panel>
  );
}
