"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";

type ManualAgent = {
  id: string;
  name: string;
  enabled: boolean;
  capabilities?: string[];
  sourceSystem?: string;
  sourceKey?: string;
};

export function WorkspaceManualAgentsPanel({ agents }: { agents: ManualAgent[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      agentId: String(formData.get("agentId") ?? "").trim(),
      capabilities: String(formData.get("capabilities") ?? "")
        .split("\n")
        .map((line) => line.replace(/^[\-\*\u2022]\s*/, "").trim())
        .filter(Boolean),
    };

    if (!payload.name || !payload.agentId) {
      setSaved(null);
      setError("Agent name and agent id are required.");
      return;
    }

    setError(null);
    setSaved(null);

    const response = await fetch("/api/workspaces/current/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "Agent could not be added.");
      return;
    }

    setSaved("Agent added to workspace.");
    event.currentTarget.reset();
    startTransition(() => router.refresh());
  }

  const manualAgents = agents.filter((agent) => agent.sourceSystem === "constructor_manual");

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Agents"
        title="Manual workspace agents"
        description="Temporary fallback when live discovery is unavailable. Add known agent ids here, then attach them to projects before assigning tasks."
      />
      <div className="space-y-5 px-5 py-5">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <label className="section-eyebrow">Agent name</label>
              <input name="name" placeholder="Nova" className="input-control mt-2" />
            </div>
            <div>
              <label className="section-eyebrow">Agent id</label>
              <input name="agentId" placeholder="nova" className="input-control mt-2" />
            </div>
          </div>

          <div>
            <label className="section-eyebrow">Capabilities</label>
            <textarea
              name="capabilities"
              placeholder={"dispatch\ncomments\nreview"}
              className="input-control mt-2 min-h-[110px] resize-none"
            />
            <p className="mt-2 text-xs text-[var(--text-dim)]">Optional. One capability per line.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {error ? <span className="text-rose-600">{error}</span> : saved ? <span className="text-emerald-600">{saved}</span> : <span className="text-[var(--text-dim)]">These agents become normal workspace members and can then be added to projects.</span>}
            </div>
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Adding..." : "Add agent"}
            </AppButton>
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <p className="section-eyebrow">Manual agents in this workspace</p>
          {manualAgents.length ? (
            <div className="mt-3 space-y-3">
              {manualAgents.map((agent) => (
                <div key={agent.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text-strong)]">{agent.name}</p>
                      <p className="text-[var(--text-dim)]">id: {agent.sourceKey ?? "—"}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">{agent.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  {agent.capabilities?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {agent.capabilities.map((capability) => (
                        <span key={capability} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-dim)]">{capability}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-dim)]">No manual agents added yet.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
