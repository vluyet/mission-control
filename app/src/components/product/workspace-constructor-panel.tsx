"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type ConstructorState = {
  id: string;
  label: string;
  baseUrl: string;
  enabled: boolean;
  callbackTokenConfigured: boolean;
  gatewayTokenConfigured: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
} | null;

export function WorkspaceConstructorPanel({ integration }: { integration: ConstructorState }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"save" | "sync" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      label: String(formData.get("label") ?? ""),
      baseUrl: String(formData.get("baseUrl") ?? "").trim(),
      callbackToken: String(formData.get("callbackToken") ?? "").trim(),
      enabled: formData.get("enabled") === "on"
    };

    if (!payload.baseUrl) {
      setError("Constructor base URL is required.");
      setSaved(null);
      return;
    }

    setError(null);
    setSaved(null);
    setSyncMessage(null);
    setLastAction("save");

    const response = await fetch("/api/workspaces/current/constructor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "Constructor settings could not be saved.");
      return;
    }

    setSaved("Constructor settings saved.");
    startTransition(() => router.refresh());
  }

  async function handleSync() {
    setError(null);
    setSaved(null);
    setSyncMessage(null);
    setLastAction("sync");

    const response = await fetch("/api/workspaces/current/constructor/sync", {
      method: "POST"
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "Constructor agent sync failed.");
      return;
    }

    const count = Array.isArray(result?.data?.agents) ? result.data.agents.length : 0;
    setSyncMessage(`Synced ${count} Constructor agent${count === 1 ? "" : "s"}.`);
    startSyncTransition(() => router.refresh());
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Constructor" title="Execution link" description="Configure the Constructor endpoint Mission Control uses for task dispatch and callbacks." />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div>
          <label className="section-eyebrow">Instance label</label>
          <input name="label" defaultValue={integration?.label ?? ""} placeholder="Primary Constructor" className="input-control mt-2" />
        </div>

        <div>
          <label className="section-eyebrow">Base URL</label>
          <input name="baseUrl" defaultValue={integration?.baseUrl ?? ""} placeholder="http://127.0.0.1:4001" className="input-control mt-2" />
        </div>

        <div>
          <label className="section-eyebrow">Callback token</label>
          <input
            name="callbackToken"
            type="password"
            defaultValue=""
            placeholder={integration?.callbackTokenConfigured ? "Saved token (leave blank to keep)" : "Optional callback shared secret"}
            className="input-control mt-2"
          />
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            Optional shared secret for validating Constructor callback requests. Leave blank to keep the currently saved token.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-strong)]">
          <input type="checkbox" name="enabled" defaultChecked={integration?.enabled ?? true} />
          Enable Constructor dispatch for this workspace
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-dim)]">
          <div className="property-row"><span>Callback token saved</span><span>{integration?.callbackTokenConfigured ? "Yes" : "No"}</span></div>
          <div className="property-row"><span>Gateway token saved</span><span>{integration?.gatewayTokenConfigured ? "Yes" : "No"}</span></div>
          <div className="property-row"><span>Last sync</span><span>{integration?.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}</span></div>
          <div className="property-row"><span>Status</span><span>{integration?.lastSyncStatus ?? (integration?.enabled === false ? "Disabled" : integration?.baseUrl ? "Configured" : "Not configured")}</span></div>
          {integration?.lastSyncError ? <p className="mt-3 text-rose-600">{integration.lastSyncError}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
            {error ? (
              <span className="text-rose-600">{error}</span>
            ) : saved ? (
              <span className="text-emerald-600">{saved}</span>
            ) : syncMessage ? (
              <span className="text-emerald-600">{syncMessage}</span>
            ) : isPending && lastAction === "save" ? (
              <span className="text-[var(--text-muted)]">Saving Constructor settings and refreshing workspace settings…</span>
            ) : isSyncing && lastAction === "sync" ? (
              <span className="text-[var(--text-muted)]">Syncing available Constructor agents and refreshing the member list…</span>
            ) : (
              <span className="text-[var(--text-dim)]">Manage the Constructor endpoint used for Mission Control task dispatch and sync available agents through the configured gateway connection.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Saving..." : "Save Constructor settings"}
            </AppButton>
            <AppButton type="button" tone="secondary" onClick={handleSync} disabled={isSyncing || isPending}>
              {isSyncing ? "Syncing..." : "Sync agents"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
