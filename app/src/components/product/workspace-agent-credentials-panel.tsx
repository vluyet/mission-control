"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AGENT_SCOPES } from "@/lib/auth";
import { useI18n } from "@/components/product/i18n-provider";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type AgentOption = {
  id: string;
  name: string;
  enabled: boolean;
};

type CredentialRecord = {
  id: string;
  name: string;
  scopes: string[];
  enabled: boolean;
  agentName: string;
  lastUsedAt: string;
  createdAt: string;
};

type AuthEventRecord = {
  id: string;
  actorType: string;
  actorLabel: string;
  eventType: string;
  detail: string;
  time: string;
};

export function WorkspaceAgentCredentialsPanel({
  agents,
  credentials,
  authEvents
}: {
  agents: AgentOption[];
  credentials: CredentialRecord[];
  authEvents: AuthEventRecord[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? "");
  const [credentialName, setCredentialName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["tasks.read", "tasks.write", "comments.write"]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  async function createCredential() {
    if (!selectedAgentId || !credentialName.trim() || !selectedScopes.length) {
      setError(t("workspaceAgentCredentials.agentNameAndScopeRequired"));
      setStatusMessage(null);
      return;
    }

    setError(null);
    setStatusMessage(t("workspaceAgentCredentials.creatingCredentialAndRefreshing"));
    setCreatedToken(null);

    const response = await fetch("/api/workspaces/current/agent-credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        membershipId: selectedAgentId,
        name: credentialName,
        scopes: selectedScopes
      })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? t("workspaceAgentCredentials.credentialCouldNotBeCreated"));
      setStatusMessage(null);
      return;
    }

    setCreatedToken(payload?.data?.token ?? null);
    setCredentialName("");
    setStatusMessage(t("workspaceAgentCredentials.credentialCreatedCopyNow"));
    startTransition(() => {
      router.refresh();
    });
  }

  async function setCredentialEnabled(id: string, enabled: boolean) {
    setError(null);
    setStatusMessage(enabled ? t("workspaceAgentCredentials.enablingCredentialAndRefreshing") : t("workspaceAgentCredentials.revokingCredentialAndRefreshing"));

    const response = await fetch(`/api/agent-credentials/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ enabled })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? t("workspaceAgentCredentials.credentialUpdateFailed"));
      setStatusMessage(null);
      return;
    }

    setStatusMessage(enabled ? t("workspaceAgentCredentials.credentialEnabled") : t("workspaceAgentCredentials.credentialRevoked"));
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <PanelHeader eyebrow={t("workspaceAgentCredentials.agentApi")} title={t("workspaceAgentCredentials.credentials")} />
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-3 xl:grid-cols-[220px,minmax(0,1fr)]">
            <select value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)} className="input-control">
              {agents.length ? (
                agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))
              ) : (
                <option value="">{t("workspaceAgentCredentials.noEnabledAgents")}</option>
              )}
            </select>
            <input
              value={credentialName}
              onChange={(event) => setCredentialName(event.target.value)}
              className="input-control"
              placeholder={t("workspaceAgentCredentials.credentialName")}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {AGENT_SCOPES.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => toggleScope(scope)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  selectedScopes.includes(scope)
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-dim)]"
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-dim)]">{t("workspaceAgentCredentials.tokensShownOnce")}</span>
            <AppButton tone="secondary" onClick={createCredential} disabled={isPending || !agents.length}>
              {isPending ? t("workspaceAgentCredentials.saving") : t("workspaceAgentCredentials.createCredential")}
            </AppButton>
          </div>

          {statusMessage ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
              {statusMessage}
            </div>
          ) : null}

          {createdToken ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{t("workspaceAgentCredentials.newToken")}</p>
              <code className="mt-2 block overflow-x-auto text-sm text-emerald-900">{createdToken}</code>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {credentials.length ? (
              credentials.map((credential) => (
                <div key={credential.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-strong)]">{credential.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-dim)]">
                        {t("workspaceAgentCredentials.credentialMeta", { agent: credential.agentName, createdAt: credential.createdAt, lastUsedAt: credential.lastUsedAt })}
                      </p>
                    </div>
                    <AppButton
                      tone="secondary"
                      onClick={() => setCredentialEnabled(credential.id, !credential.enabled)}
                    >
                      {credential.enabled ? t("workspaceAgentCredentials.revoke") : t("workspaceAgentCredentials.enable")}
                    </AppButton>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {credential.scopes.map((scope) => (
                      <span key={scope} className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-dim)]">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-dim)]">
                {agents.length
                  ? t("workspaceAgentCredentials.noCredentialsYet")
                  : t("workspaceAgentCredentials.noEnabledAgentsAvailable")}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader eyebrow={t("workspaceAgentCredentials.authEvents")} title={t("workspaceAgentCredentials.recentAccess")} />
        <div className="space-y-3 px-5 py-5">
          {authEvents.length ? (
            authEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-strong)]">{event.actorLabel}</p>
                  <span className="text-xs text-[var(--text-dim)]">{event.time}</span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">{event.eventType}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{event.detail}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-dim)]">
              {t("workspaceAgentCredentials.noAuthEventsYet")}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
