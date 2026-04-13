"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type ConstructorState = {
  id: string;
  label: string;
  baseUrl: string;
  enabled: boolean;
  apiToken: string | null;
  callbackToken: string | null;
  apiTokenConfigured: boolean;
  callbackTokenConfigured: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
} | null;

type TokenMode = "keep" | "replace" | "clear";

function generateSecret(prefix: string) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${token}`;
}

function TokenActionButton({
  children,
  onClick,
  disabled = false
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-strong)] transition hover:border-[var(--text-dim)] hover:bg-[var(--surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function WorkspaceConstructorPanel({ integration }: { integration: ConstructorState }) {
  const router = useRouter();
  const [label, setLabel] = useState(integration?.label ?? "");
  const [baseUrl, setBaseUrl] = useState(integration?.baseUrl ?? "");
  const [enabled, setEnabled] = useState(integration?.enabled ?? true);
  const [apiToken, setApiToken] = useState(integration?.apiToken ?? "");
  const [callbackToken, setCallbackToken] = useState(integration?.callbackToken ?? "");
  const [apiTokenMode, setApiTokenMode] = useState<TokenMode>(integration?.apiTokenConfigured ? "keep" : "replace");
  const [callbackTokenMode, setCallbackTokenMode] = useState<TokenMode>(integration?.callbackTokenConfigured ? "keep" : "keep");
  const [showApiToken, setShowApiToken] = useState(false);
  const [showCallbackToken, setShowCallbackToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"save" | "sync" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  useEffect(() => {
    setLabel(integration?.label ?? "");
    setBaseUrl(integration?.baseUrl ?? "");
    setEnabled(integration?.enabled ?? true);
    setApiToken(integration?.apiToken ?? "");
    setCallbackToken(integration?.callbackToken ?? "");
    setApiTokenMode(integration?.apiTokenConfigured ? "keep" : "replace");
    setCallbackTokenMode(integration?.callbackTokenConfigured ? "keep" : "keep");
  }, [
    integration?.id,
    integration?.label,
    integration?.baseUrl,
    integration?.enabled,
    integration?.apiToken,
    integration?.callbackToken,
    integration?.apiTokenConfigured,
    integration?.callbackTokenConfigured
  ]);

  const apiTokenReady = apiTokenMode === "replace" ? apiToken.trim().length > 0 : Boolean(integration?.apiTokenConfigured);
  const callbackTokenReady = callbackTokenMode === "replace" ? callbackToken.trim().length > 0 : callbackTokenMode === "keep" && Boolean(integration?.callbackTokenConfigured);

  async function copyToClipboard(value: string, labelText: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setSyncMessage(null);
      setSaved(`${labelText} copied.`);
    } catch {
      setSaved(null);
      setSyncMessage(null);
      setError(`Could not copy ${labelText.toLowerCase()}.`);
    }
  }

  function createApiToken() {
    const nextToken = generateSecret("ctor_live");
    setApiToken(nextToken);
    setApiTokenMode("replace");
    setShowApiToken(true);
    setError(null);
    setSyncMessage(null);
    setSaved("New Constructor API token ready. Save settings, then paste the same value into Constructor as CONSTRUCTOR_API_TOKEN.");
  }

  function createCallbackToken() {
    const nextToken = generateSecret("ctor_callback");
    setCallbackToken(nextToken);
    setCallbackTokenMode("replace");
    setShowCallbackToken(true);
    setError(null);
    setSyncMessage(null);
    setSaved("New Constructor callback token ready. Save settings before testing callbacks.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) {
      setError("Constructor base URL is required.");
      setSaved(null);
      return;
    }

    if (!apiTokenReady) {
      setError("Constructor API token is required. Create one here or paste the token already configured in Constructor.");
      setSaved(null);
      return;
    }

    const payload: {
      label: string;
      baseUrl: string;
      enabled: boolean;
      apiToken?: string;
      callbackToken?: string;
    } = {
      label,
      baseUrl: trimmedBaseUrl,
      enabled
    };

    if (apiTokenMode === "replace") {
      payload.apiToken = apiToken.trim();
    }

    if (callbackTokenMode === "replace") {
      payload.callbackToken = callbackToken.trim();
    } else if (callbackTokenMode === "clear") {
      payload.callbackToken = "";
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
      <PanelHeader eyebrow="Constructor" title="Execution link" description="Configure the Constructor public API endpoint Mission Control uses for agent sync, task dispatch, and callbacks." />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4 text-sm text-[var(--text-dim)]">
          <p className="font-semibold text-[var(--text-strong)]">Public API requirements</p>
          <ul className="mt-3 list-disc space-y-1 pl-4">
            <li>Mission Control calls <code>GET /api/v1/agents</code> and <code>POST /api/v1/tasks</code> on the configured Constructor base URL.</li>
            <li>An API token is required for every public API request. Generate it here, save it, then set the same value in Constructor as <code>CONSTRUCTOR_API_TOKEN</code>.</li>
            <li>Callbacks return to Mission Control at <code>/api/tasks/:taskId/constructor/callback</code>. Constructor currently does not sign callbacks, so callback delivery depends only on the URL being reachable and returning a 2xx response.</li>
          </ul>
        </div>

        <div>
          <label className="section-eyebrow">Instance label</label>
          <input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Primary Constructor"
            className="input-control mt-2"
          />
        </div>

        <div>
          <label className="section-eyebrow">Base URL</label>
          <input
            name="baseUrl"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://127.0.0.1:8787 or http://127.0.0.1:8787/api/v1"
            className="input-control mt-2"
          />
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            Required. Mission Control accepts either the Constructor root URL or a URL already ending in <code>/api/v1</code>.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="section-eyebrow">API token</label>
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                Required bearer token for Constructor public API requests.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TokenActionButton onClick={createApiToken}>Create token</TokenActionButton>
              <TokenActionButton onClick={() => setShowApiToken((value) => !value)} disabled={!apiToken && apiTokenMode !== "replace"}>
                {showApiToken ? "Hide" : "Show"}
              </TokenActionButton>
              <TokenActionButton onClick={() => copyToClipboard(apiToken, "API token")} disabled={!apiToken}>
                Copy
              </TokenActionButton>
            </div>
          </div>

          <input
            name="apiToken"
            type={showApiToken ? "text" : "password"}
            value={apiToken}
            onChange={(event) => {
              const nextValue = event.target.value;
              setApiToken(nextValue);
              setApiTokenMode(nextValue.trim() ? "replace" : integration?.apiTokenConfigured ? "keep" : "replace");
            }}
            placeholder={integration?.apiTokenConfigured ? "Saved token retained unless you replace it here" : "Constructor public API bearer token"}
            className="input-control"
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-dim)]">
            <span>
              {apiTokenMode === "replace"
                ? "New token ready to save."
                : integration?.apiToken
                  ? "Saved token is loaded from workspace settings and will stay in place until you replace it."
                  : integration?.apiTokenConfigured
                    ? "Constructor is using an environment token. Save a workspace token here if you want to reopen it later."
                  : "No API token saved yet."}
            </span>
            <span>{apiTokenReady ? "API token available" : "API token required"}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="section-eyebrow">Callback token</label>
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                Saved for future use, but not enforced by the current Constructor public API because callbacks are unsigned.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TokenActionButton onClick={createCallbackToken}>Create token</TokenActionButton>
              <TokenActionButton onClick={() => setShowCallbackToken((value) => !value)} disabled={!callbackToken && !callbackTokenReady}>
                {showCallbackToken ? "Hide" : "Show"}
              </TokenActionButton>
              <TokenActionButton onClick={() => copyToClipboard(callbackToken, "Callback token")} disabled={!callbackToken}>
                Copy
              </TokenActionButton>
              <TokenActionButton
                onClick={() => {
                  setCallbackToken("");
                  setCallbackTokenMode("clear");
                  setShowCallbackToken(false);
                  setError(null);
                  setSyncMessage(null);
                  setSaved("Callback token will be removed the next time you save Constructor settings.");
                }}
                disabled={!integration?.callbackTokenConfigured && !callbackToken}
              >
                Clear
              </TokenActionButton>
            </div>
          </div>

          <input
            name="callbackToken"
            type={showCallbackToken ? "text" : "password"}
            value={callbackToken}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCallbackToken(nextValue);
              setCallbackTokenMode(nextValue.trim() ? "replace" : integration?.callbackTokenConfigured ? "keep" : "keep");
            }}
            placeholder={integration?.callbackTokenConfigured ? "Saved callback token retained unless you replace or clear it" : "Optional callback shared secret"}
            className="input-control"
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-dim)]">
            <span>
              {callbackTokenMode === "replace"
                ? "New callback token ready to save."
                : callbackTokenMode === "clear"
                  ? "Callback token will be cleared on save."
                  : integration?.callbackToken
                    ? "Saved callback token is loaded from workspace settings and will stay in place until you replace or clear it."
                    : "Callback token not configured."}
            </span>
            <span>{callbackTokenReady ? "Callback token available" : "No callback token configured"}</span>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-strong)]">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Enable Constructor dispatch for this workspace
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-dim)]">
          <div className="property-row"><span>API token saved</span><span>{integration?.apiTokenConfigured ? "Yes" : "No"}</span></div>
          <div className="property-row"><span>Callback token saved</span><span>{integration?.callbackTokenConfigured ? "Yes" : "No"}</span></div>
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
              <span className="text-[var(--text-dim)]">Save the base URL and API token first, then sync agents from Constructor before dispatch testing.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Saving..." : "Save Constructor settings"}
            </AppButton>
            <AppButton type="button" tone="secondary" onClick={handleSync} disabled={isSyncing || isPending || !baseUrl.trim() || !apiTokenReady}>
              {isSyncing ? "Syncing..." : "Sync agents"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}