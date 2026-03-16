"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppButton, Panel } from "@/components/ui/primitives";

type TaskViewState = {
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
    if (value) {
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
  preservedParams = {}
}: {
  storageKey: string;
  basePath: string;
  current: TaskViewState;
  preservedParams?: Record<string, string>;
}) {
  const router = useRouter();
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
    const label = window.prompt("Name this saved view");
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
    () => Boolean(current.status || current.timing || current.tag || current.sort !== "due"),
    [current]
  );

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-eyebrow">Saved views</p>
        </div>
        <AppButton tone="secondary" onClick={saveCurrent} disabled={!canSave}>
          Save current view
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
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-dim)]">No saved views yet</p>
      )}
    </Panel>
  );
}
