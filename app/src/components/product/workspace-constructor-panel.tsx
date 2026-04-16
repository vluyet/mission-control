"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
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
  const { t, locale } = useI18n();
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
      setSaved(t("constructorPanel.copied", { label: labelText }));
    } catch {
      setSaved(null);
      setSyncMessage(null);
      setError(t("constructorPanel.copyFailed", { label: labelText.toLowerCase() }));
    }
  }

  function createApiToken() {
    const nextToken = generateSecret("ctor_live");
    setApiToken(nextToken);
    setApiTokenMode("replace");
    setShowApiToken(true);
    setError(null);
    setSyncMessage(null);
    setSaved(t("constructorPanel.newApiTokenReady"));
  }

  function createCallbackToken() {
    const nextToken = generateSecret("ctor_callback");
    setCallbackToken(nextToken);
    setCallbackTokenMode("replace");
    setShowCallbackToken(true);
    setError(null);
    setSyncMessage(null);
    setSaved(t("constructorPanel.newCallbackTokenReady"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) {
      setError(t("constructorPanel.baseUrlRequired"));
      setSaved(null);
      return;
    }

    if (!apiTokenReady) {
      setError(t("constructorPanel.apiTokenRequired"));
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
      setError(result?.error?.message ?? t("constructorPanel.settingsSaveFailed"));
      return;
    }

    setSaved(t("constructorPanel.settingsSaved"));
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
      setError(result?.error?.message ?? t("constructorPanel.syncFailed"));
      return;
    }

    const count = Array.isArray(result?.data?.agents) ? result.data.agents.length : 0;
    setSyncMessage(t(count === 1 ? "constructorPanel.syncedOneAgent" : "constructorPanel.syncedManyAgents", { count }));
    startSyncTransition(() => router.refresh());
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={t("constructorPanel.eyebrow")} title={t("constructorPanel.title")} description={t("constructorPanel.description")} />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-4 text-sm text-[var(--text-dim)]">
          <p className="font-semibold text-[var(--text-strong)]">{t("constructorPanel.publicApiRequirements")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-4">
            <li>{t("constructorPanel.requirementAgentsAndTasks")}</li>
            <li>{t("constructorPanel.requirementApiToken")}</li>
            <li>{t("constructorPanel.requirementCallbacks")}</li>
          </ul>
        </div>

        <div>
          <label className="section-eyebrow">{t("constructorPanel.instanceLabel")}</label>
          <input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("constructorPanel.instancePlaceholder")}
            className="input-control mt-2"
          />
        </div>

        <div>
          <label className="section-eyebrow">{t("constructorPanel.baseUrl")}</label>
          <input
            name="baseUrl"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={t("constructorPanel.baseUrlPlaceholder")}
            className="input-control mt-2"
          />
          <p className="mt-2 text-xs text-[var(--text-dim)]">{t("constructorPanel.baseUrlHelp")}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="section-eyebrow">{t("constructorPanel.apiToken")}</label>
              <p className="mt-1 text-xs text-[var(--text-dim)]">{t("constructorPanel.apiTokenHelp")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TokenActionButton onClick={createApiToken}>{t("constructorPanel.createToken")}</TokenActionButton>
              <TokenActionButton onClick={() => setShowApiToken((value) => !value)} disabled={!apiToken && apiTokenMode !== "replace"}>
                {showApiToken ? t("constructorPanel.hide") : t("constructorPanel.show")}
              </TokenActionButton>
              <TokenActionButton onClick={() => copyToClipboard(apiToken, t("constructorPanel.apiTokenLabel"))} disabled={!apiToken}>
                {t("constructorPanel.copy")}
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
            placeholder={integration?.apiTokenConfigured ? t("constructorPanel.savedTokenRetained") : t("constructorPanel.apiTokenPlaceholder")}
            className="input-control"
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-dim)]">
            <span>
              {apiTokenMode === "replace"
                ? t("constructorPanel.newTokenReady")
                : integration?.apiToken
                  ? t("constructorPanel.savedTokenLoaded")
                  : integration?.apiTokenConfigured
                    ? t("constructorPanel.environmentTokenInUse")
                    : t("constructorPanel.noApiTokenSaved")}
            </span>
            <span>{apiTokenReady ? t("constructorPanel.apiTokenAvailable") : t("constructorPanel.apiTokenRequiredShort")}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="section-eyebrow">{t("constructorPanel.callbackToken")}</label>
              <p className="mt-1 text-xs text-[var(--text-dim)]">{t("constructorPanel.callbackTokenHelp")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TokenActionButton onClick={createCallbackToken}>{t("constructorPanel.createToken")}</TokenActionButton>
              <TokenActionButton onClick={() => setShowCallbackToken((value) => !value)} disabled={!callbackToken && !callbackTokenReady}>
                {showCallbackToken ? t("constructorPanel.hide") : t("constructorPanel.show")}
              </TokenActionButton>
              <TokenActionButton onClick={() => copyToClipboard(callbackToken, t("constructorPanel.callbackTokenLabel"))} disabled={!callbackToken}>
                {t("constructorPanel.copy")}
              </TokenActionButton>
              <TokenActionButton
                onClick={() => {
                  setCallbackToken("");
                  setCallbackTokenMode("clear");
                  setShowCallbackToken(false);
                  setError(null);
                  setSyncMessage(null);
                  setSaved(t("constructorPanel.callbackTokenWillBeRemoved"));
                }}
                disabled={!integration?.callbackTokenConfigured && !callbackToken}
              >
                {t("constructorPanel.clear")}
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
            placeholder={integration?.callbackTokenConfigured ? t("constructorPanel.savedCallbackTokenRetained") : t("constructorPanel.callbackTokenPlaceholder")}
            className="input-control"
            autoComplete="off"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-dim)]">
            <span>
              {callbackTokenMode === "replace"
                ? t("constructorPanel.newCallbackTokenReadyShort")
                : callbackTokenMode === "clear"
                  ? t("constructorPanel.callbackTokenClearedOnSave")
                  : integration?.callbackToken
                    ? t("constructorPanel.savedCallbackTokenLoaded")
                    : t("constructorPanel.callbackTokenNotConfigured")}
            </span>
            <span>{callbackTokenReady ? t("constructorPanel.callbackTokenAvailable") : t("constructorPanel.noCallbackTokenConfigured")}</span>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--text-strong)]">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          {t("constructorPanel.enableDispatch")}
        </label>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-dim)]">
          <div className="property-row"><span>{t("constructorPanel.apiTokenSaved")}</span><span>{integration?.apiTokenConfigured ? t("constructorPanel.yes") : t("constructorPanel.no")}</span></div>
          <div className="property-row"><span>{t("constructorPanel.callbackTokenSaved")}</span><span>{integration?.callbackTokenConfigured ? t("constructorPanel.yes") : t("constructorPanel.no")}</span></div>
          <div className="property-row"><span>{t("constructorPanel.lastSync")}</span><span>{integration?.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString(locale) : t("constructorPanel.never")}</span></div>
          <div className="property-row"><span>{t("constructorPanel.status")}</span><span>{integration?.lastSyncStatus ?? (integration?.enabled === false ? t("constructorPanel.disabled") : integration?.baseUrl ? t("constructorPanel.configured") : t("constructorPanel.notConfigured"))}</span></div>
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
              <span className="text-[var(--text-muted)]">{t("constructorPanel.savingAndRefreshing")}</span>
            ) : isSyncing && lastAction === "sync" ? (
              <span className="text-[var(--text-muted)]">{t("constructorPanel.syncingAndRefreshing")}</span>
            ) : (
              <span className="text-[var(--text-dim)]">{t("constructorPanel.saveThenSyncHint")}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? t("constructorPanel.saving") : t("constructorPanel.saveSettings")}
            </AppButton>
            <AppButton type="button" tone="secondary" onClick={handleSync} disabled={isSyncing || isPending || !baseUrl.trim() || !apiTokenReady}>
              {isSyncing ? t("constructorPanel.syncing") : t("constructorPanel.syncAgents")}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
