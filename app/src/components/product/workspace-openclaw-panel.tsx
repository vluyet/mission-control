"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type OpenClawState = {
  id: string;
  label: string;
  baseUrl: string;
  enabled: boolean;
  tokenConfigured: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
} | null;

export function WorkspaceOpenClawPanel({ integration }: { integration: OpenClawState }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      label: String(formData.get("label") ?? ""),
      baseUrl: String(formData.get("baseUrl") ?? "").trim(),
      gatewayToken: String(formData.get("gatewayToken") ?? "").trim(),
      enabled: formData.get("enabled") === "on"
    };

    if (!payload.baseUrl) {
      setError("OpenClaw base URL is required.");
      setSaved(null);
      return;
    }

    setError(null);
    setSaved(null);
    setSyncMessage(null);

    const response = await fetch("/api/workspaces/current/openclaw", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "OpenClaw settings could not be saved.");
      return;
    }

    setSaved("OpenClaw link saved.");
    startTransition(() => router.refresh());
  }

  async function handleSync() {
    setError(null);
    setSaved(null);
    setSyncMessage(null);

    const response = await fetch("/api/workspaces/current/openclaw/sync", {
      method: "POST"
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "OpenClaw sync failed.");
      return;
    }

    const count = Array.isArray(result?.data?.agents) ? result.data.agents.length : 0;
    setSyncMessage(`Synced ${count} OpenClaw agent${count === 1 ? "" : "s"}.`);
    startSyncTransition(() => router.refresh());
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="OpenClaw" title="Mission Control runtime link" />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div>
          <label className="section-eyebrow">Instance label</label>
          <input name="label" defaultValue={integration?.label ?? ""} placeholder="Studio OpenClaw" className="input-control mt-2" />
        </div>

        <div>
          <label className="section-eyebrow">Gateway base URL</label>
          <input name="baseUrl" defaultValue={integration?.baseUrl ?? ""} placeholder="http://host.docker.internal:18789" className="input-control mt-2" />
        </div>

        <div>
          <label className="section-eyebrow">Gateway token</label>
          <input
            name="gatewayToken"
            type="password"
            defaultValue=""
            placeholder={integration?.tokenConfigured ? "Saved token (leave blank to keep)" : "Paste OpenClaw gateway token"}
            className="input-control mt-2"
          />
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            Used for authenticated agent discovery. Leave blank to keep the currently saved token.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-strong)]">
          <input type="checkbox" name="enabled" defaultChecked={integration?.enabled ?? true} />
          Enable OpenClaw sync for this workspace
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-dim)]">
          <div className="property-row"><span>Token saved</span><span>{integration?.tokenConfigured ? "Yes" : "No"}</span></div>
          <div className="property-row"><span>Last sync</span><span>{integration?.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}</span></div>
          <div className="property-row"><span>Status</span><span>{integration?.lastSyncStatus ?? "Not synced"}</span></div>
          {integration?.lastSyncError ? <p className="mt-3 text-rose-600">{integration.lastSyncError}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-sm">
            {error ? <span className="text-rose-600">{error}</span> : saved ? <span className="text-emerald-600">{saved}</span> : syncMessage ? <span className="text-emerald-600">{syncMessage}</span> : <span className="text-[var(--text-dim)]">Link Mission Control to an OpenClaw gateway and sync available agents.</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Saving..." : "Save OpenClaw link"}
            </AppButton>
            <AppButton type="button" tone="secondary" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? "Syncing..." : "Sync agents"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
