"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import type { AttachmentRecord } from "@/lib/demo-data";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { WorkspaceAssetsPanel } from "@/components/product/workspace-assets-panel";
import { WorkspaceAgentCredentialsPanel } from "@/components/product/workspace-agent-credentials-panel";
import { WorkspaceOpenClawPanel } from "@/components/product/workspace-openclaw-panel";

type WorkspaceManageValues = {
  name: string;
  visibility: "personal" | "shared";
  contextTitle: string;
  contextSummary: string;
  contextBullets: string[];
  memberCount: number;
  projectCount: number;
  humanCount: number;
  agentCount: number;
  attachmentCount: number;
  workspaceAssetCount: number;
  assets: AttachmentRecord[];
  agents: { id: string; name: string; enabled: boolean; capabilities?: string[]; sourceSystem?: string }[];
  agentCredentials: {
    id: string;
    name: string;
    scopes: string[];
    enabled: boolean;
    agentName: string;
    lastUsedAt: string;
    createdAt: string;
  }[];
  authEvents: {
    id: string;
    actorType: string;
    actorLabel: string;
    eventType: string;
    detail: string;
    time: string;
  }[];
  openclaw: {
    id: string;
    label: string;
    baseUrl: string;
    enabled: boolean;
    tokenConfigured: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
  } | null;
};

export function WorkspaceManageForm({ workspace }: { workspace: WorkspaceManageValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      visibility: String(formData.get("visibility") ?? "personal") as "personal" | "shared",
      contextTitle: String(formData.get("contextTitle") ?? ""),
      contextSummary: String(formData.get("contextSummary") ?? ""),
      contextBullets: String(formData.get("contextBullets") ?? "")
        .split("\n")
        .map((line) => line.replace(/^[\-\*\u2022]\s*/, "").trim())
        .filter(Boolean)
    };

    if (!payload.name.trim()) {
      setSaved(null);
      setError("Workspace name is required.");
      return;
    }

    setError(null);
    setSaved(null);

    const response = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error?.message ?? "Workspace could not be updated.");
      return;
    }

    setSaved("Saved");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow="Guide"
            title="What lives here"
            description="Use this page to update workspace identity, review scope, manage the OpenClaw connection, and rotate agent credentials without hunting through unrelated controls."
          />
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
            <a href="#workspace-settings" className="quick-link"><span>Workspace settings</span><span>Jump</span></a>
            <a href="#workspace-scope" className="quick-link"><span>Scope & links</span><span>Jump</span></a>
            <a href="#workspace-openclaw" className="quick-link"><span>OpenClaw connection</span><span>Jump</span></a>
            <a href="#workspace-credentials" className="quick-link"><span>Agent credentials</span><span>Jump</span></a>
          </div>
        </Panel>

        <div id="workspace-settings">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="General" title="Workspace settings" description="Keep the workspace small and understandable. Advanced controls are separated below." />
          <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),220px]">
              <div>
                <label className="section-eyebrow">Name</label>
                <input name="name" defaultValue={workspace.name} className="input-control mt-2" />
              </div>
              <div>
                <label className="section-eyebrow">Visibility</label>
                <select name="visibility" defaultValue={workspace.visibility} className="input-control mt-2">
                  <option value="personal">Owner workspace</option>
                  <option value="shared">Shared workspace</option>
                </select>
              </div>
            </div>

            <div>
              <label className="section-eyebrow">Context title</label>
              <input name="contextTitle" defaultValue={workspace.contextTitle} className="input-control mt-2" />
            </div>

            <div>
              <label className="section-eyebrow">Context summary</label>
              <textarea
                name="contextSummary"
                defaultValue={workspace.contextSummary}
                className="input-control mt-2 min-h-[140px] resize-none"
              />
            </div>

            <div>
              <label className="section-eyebrow">Context bullets</label>
              <textarea
                name="contextBullets"
                defaultValue={workspace.contextBullets.join("\n")}
                className="input-control mt-2 min-h-[160px] resize-none"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {error ? <span className="text-rose-600">{error}</span> : saved ? <span className="text-emerald-600">{saved}</span> : <span className="text-[var(--text-dim)]">Workspace settings</span>}
              </div>
              <AppButton type="submit" tone="primary" className={isPending ? "opacity-70" : ""}>
                {isPending ? "Saving..." : "Save workspace"}
              </AppButton>
            </div>
          </form>
        </Panel>
        </div>

        {workspace.assets.length ? <WorkspaceAssetsPanel assets={workspace.assets} /> : null}

        <div id="workspace-scope">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Scope" title="Workspace scope" />
          <div className="space-y-3 px-5 py-5">
            <div className="property-row">
              <span>Projects</span>
              <span>{workspace.projectCount}</span>
            </div>
            <div className="property-row">
              <span>Members</span>
              <span>{workspace.memberCount}</span>
            </div>
            <div className="property-row">
              <span>Humans</span>
              <span>{workspace.humanCount}</span>
            </div>
            <div className="property-row">
              <span>Agents</span>
              <span>{workspace.agentCount}</span>
            </div>
            <div className="property-row">
              <span>Workspace files</span>
              <span>{workspace.workspaceAssetCount}</span>
            </div>
            <div className="property-row">
              <span>Task files</span>
              <span>{workspace.attachmentCount}</span>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Navigation" title="Open related areas" />
          <div className="space-y-3 px-5 py-5">
            <Link href="/members" className="quick-link">
              <span>Members</span>
              <span>Open</span>
            </Link>
            <Link href="/projects" className="quick-link">
              <span>Projects</span>
              <span>Open</span>
            </Link>
            <Link href="/queue" className="quick-link">
              <span>Agent queue</span>
              <span>Open</span>
            </Link>
          </div>
        </Panel>
        </div>

        <div id="workspace-openclaw">
          <WorkspaceOpenClawPanel integration={workspace.openclaw} />
        </div>

        {(workspace.agentCredentials.length || workspace.authEvents.length) ? (
          <div id="workspace-credentials">
            <WorkspaceAgentCredentialsPanel
              agents={workspace.agents}
              credentials={workspace.agentCredentials}
              authEvents={workspace.authEvents}
            />
          </div>
        ) : null}
    </div>
  );
}
