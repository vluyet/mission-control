"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AGENT_SCOPES } from "@/lib/auth";
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
      setError("Agent, name, and at least one scope are required.");
      setStatusMessage(null);
      return;
    }

    setError(null);
    setStatusMessage("Creating credential and refreshing the workspace record…");
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
      setError(payload?.error?.message ?? "Credential could not be created.");
      setStatusMessage(null);
      return;
    }

    setCreatedToken(payload?.data?.token ?? null);
    setCredentialName("");
    setStatusMessage("Credential created. Copy the token now — it will not be shown again.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function setCredentialEnabled(id: string, enabled: boolean) {
    setError(null);
    setStatusMessage(enabled ? "Enabling credential and refreshing the list…" : "Revoking credential and refreshing the list…");

    const response = await fetch(`/api/agent-credentials/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ enabled })
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Credential update failed.");
      setStatusMessage(null);
      return;
    }

    setStatusMessage(enabled ? "Credential enabled." : "Credential revoked.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <PanelHeader eyebrow="Agent API" title="Credentials" />
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
                <option value="">No enabled agents</option>
              )}
            </select>
            <input
              value={credentialName}
              onChange={(event) => setCredentialName(event.target.value)}
              className="input-control"
              placeholder="Credential name"
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
            <span className="text-xs text-[var(--text-dim)]">Tokens are only shown once at creation.</span>
            <AppButton tone="secondary" onClick={createCredential} disabled={isPending || !agents.length}>
              {isPending ? "Saving..." : "Create credential"}
            </AppButton>
          </div>

          {statusMessage ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
              {statusMessage}
            </div>
          ) : null}

          {createdToken ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">New token</p>
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
                        {credential.agentName} · Created {credential.createdAt} · Last used {credential.lastUsedAt}
                      </p>
                    </div>
                    <AppButton
                      tone="secondary"
                      onClick={() => setCredentialEnabled(credential.id, !credential.enabled)}
                    >
                      {credential.enabled ? "Revoke" : "Enable"}
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
                  ? "No agent credentials yet. Create one when an agent needs API access."
                  : "No enabled agents are available yet. Enable or sync an agent first, then create a credential here."}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader eyebrow="Auth events" title="Recent access" />
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
              No auth events yet. Recent credential use will appear here once an agent starts calling the API.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
