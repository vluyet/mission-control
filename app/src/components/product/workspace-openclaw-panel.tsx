"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type OpenClawIntegrationRecord = {
  id?: string;
  label: string;
  dashboardUrl: string;
  enabled: boolean;
  discoveryMode: "cli" | "config_file";
  executable: string;
  arguments: string[];
  configPath: string;
  lastSyncedAt: string;
  lastSyncStatus: string;
  lastSyncMessage: string;
} | null;

type OpenClawAgentRecord = {
  id: string;
  name: string;
  enabled: boolean;
  capabilities?: string[];
  sourceSystem?: string;
};

function getDefaultConfig(integration: OpenClawIntegrationRecord) {
  return {
    label: integration?.label ?? "Primary OpenClaw",
    dashboardUrl: integration?.dashboardUrl ?? "",
    enabled: integration?.enabled ?? false,
    discoveryMode: integration?.discoveryMode ?? "cli",
    executable: integration?.executable ?? "openclaw",
    arguments: integration?.arguments?.length ? integration.arguments : ["agents", "list", "--json"],
    configPath: integration?.configPath ?? ""
  };
}

export function WorkspaceOpenClawPanel({
  integration,
  agents
}: {
  integration: OpenClawIntegrationRecord;
  agents: OpenClawAgentRecord[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, startTransition] = useTransition();
  const defaultConfig = useMemo(() => getDefaultConfig(integration), [integration]);
  const sourcedAgents = agents.filter((agent) => agent.sourceSystem === "openclaw");

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setSyncSummary(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const discoveryMode = String(formData.get("discoveryMode") ?? "cli") as "cli" | "config_file";
    const payload = {
      label: String(formData.get("label") ?? ""),
      dashboardUrl: String(formData.get("dashboardUrl") ?? ""),
      enabled: formData.get("enabled") === "on",
      discoveryMode,
      executable: String(formData.get("executable") ?? ""),
      arguments: String(formData.get("arguments") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      configPath: String(formData.get("configPath") ?? "")
    };

    const response = await fetch("/api/workspaces/current/openclaw", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setIsSaving(false);
      setError(result?.error?.message ?? "OpenClaw settings could not be saved.");
      return;
    }

    setIsSaving(false);
    setSaved("Saved");
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSync() {
    setError(null);
    setSaved(null);
    setSyncSummary(null);
    setIsSyncing(true);

    const response = await fetch("/api/workspaces/current/openclaw/sync", {
      method: "POST"
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setIsSyncing(false);
      setError(result?.error?.message ?? "OpenClaw sync failed.");
      return;
    }

    setIsSyncing(false);
    const data = result?.data;
    setSyncSummary(
      `Synced ${data?.discoveredAgents?.length ?? 0} agents. Created ${data?.created ?? 0}, updated ${data?.updated ?? 0}, disabled ${data?.disabled ?? 0}.`
    );
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="OpenClaw" title="Instance sync" />
      <form onSubmit={handleSave} className="space-y-5 px-5 py-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),220px]">
          <div>
            <label className="section-eyebrow">Instance label</label>
            <input name="label" defaultValue={defaultConfig.label} className="input-control mt-2" />
          </div>
          <div>
            <label className="section-eyebrow">Discovery mode</label>
            <select name="discoveryMode" defaultValue={defaultConfig.discoveryMode} className="input-control mt-2">
              <option value="cli">CLI</option>
              <option value="config_file">Config file</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),160px]">
          <div>
            <label className="section-eyebrow">Dashboard URL (optional reference)</label>
            <input
              name="dashboardUrl"
              defaultValue={defaultConfig.dashboardUrl}
              className="input-control mt-2"
              placeholder="https://control.openclaw.local"
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-strong)]">
            <input type="checkbox" name="enabled" defaultChecked={defaultConfig.enabled} className="h-4 w-4 accent-[var(--accent-strong)]" />
            Enabled
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <p className="text-sm font-medium text-[var(--text-strong)]">
            Agent discovery does not use the dashboard URL yet. Launch-safe discovery uses either <code className="text-xs">openclaw agents list --json</code> inside the app container or a mounted <code className="text-xs">openclaw.json</code> file.
          </p>
          <p className="mt-2 text-sm text-[var(--text-dim)]">
            If you see <code className="text-xs">spawn openclaw ENOENT</code>, the CLI mode is enabled but the <code className="text-xs">openclaw</code> binary is not available inside the Mission Control container.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <label className="section-eyebrow">CLI executable</label>
            <input
              name="executable"
              defaultValue={defaultConfig.executable}
              className="input-control mt-2"
              placeholder="openclaw"
            />
          </div>
          <div>
            <label className="section-eyebrow">Config path</label>
            <input
              name="configPath"
              defaultValue={defaultConfig.configPath}
              className="input-control mt-2"
              placeholder="/workspace/openclaw/openclaw.json"
            />
          </div>
        </div>

        <div>
          <label className="section-eyebrow">CLI arguments</label>
          <textarea
            name="arguments"
            defaultValue={defaultConfig.arguments.join("\n")}
            className="input-control mt-2 min-h-[140px] resize-none"
          />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 sm:grid-cols-3">
          <div>
            <p className="section-eyebrow">Last sync</p>
            <p className="mt-2 text-sm text-[var(--text-strong)]">{integration?.lastSyncedAt ?? "Never"}</p>
          </div>
          <div>
            <p className="section-eyebrow">Status</p>
            <p className="mt-2 text-sm capitalize text-[var(--text-strong)]">{integration?.lastSyncStatus ?? "idle"}</p>
          </div>
          <div>
            <p className="section-eyebrow">Message</p>
            <p className="mt-2 text-sm text-[var(--text-dim)]">{integration?.lastSyncMessage || "No sync has run yet."}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {saved ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{saved}</div>
        ) : null}
        {syncSummary ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">{syncSummary}</div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--text-dim)]">{sourcedAgents.length} synced OpenClaw agents</div>
          <div className="flex gap-3">
            <AppButton tone="secondary" type="button" onClick={handleSync} disabled={isSaving || isSyncing}>
              {isSyncing ? "Syncing..." : "Sync agents"}
            </AppButton>
            <AppButton tone="primary" type="submit" disabled={isSaving || isSyncing}>
              {isSaving ? "Saving..." : "Save integration"}
            </AppButton>
          </div>
        </div>

        <div className="space-y-3">
          {sourcedAgents.length ? (
            sourcedAgents.map((agent) => (
              <div key={agent.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">{agent.name}</p>
                  <span className="text-xs text-[var(--text-dim)]">{agent.enabled ? "Active" : "Inactive"}</span>
                </div>
                {agent.capabilities?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agent.capabilities.slice(0, 6).map((capability) => (
                      <span key={capability} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-dim)]">
                        {capability}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-dim)]">
              No OpenClaw agents synced yet.
            </div>
          )}
        </div>
      </form>
    </Panel>
  );
}
