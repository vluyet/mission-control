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
} | null;

export function WorkspaceConstructorPanel({ integration }: { integration: ConstructorState }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          <div className="property-row"><span>Status</span><span>{integration?.enabled === false ? "Disabled" : integration?.baseUrl ? "Configured" : "Not configured"}</span></div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
            {error ? (
              <span className="text-rose-600">{error}</span>
            ) : saved ? (
              <span className="text-emerald-600">{saved}</span>
            ) : isPending ? (
              <span className="text-[var(--text-muted)]">Saving Constructor settings and refreshing workspace settings…</span>
            ) : (
              <span className="text-[var(--text-dim)]">Manage the Constructor endpoint used for Mission Control task dispatch.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
              {isPending ? "Saving..." : "Save Constructor settings"}
            </AppButton>
          </div>
        </div>
      </form>
    </Panel>
  );
}
