"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import type { AttachmentRecord } from "@/lib/demo-data";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { WorkspaceAssetsPanel } from "@/components/product/workspace-assets-panel";
import { WorkspaceAgentCredentialsPanel } from "@/components/product/workspace-agent-credentials-panel";
import { WorkspaceConstructorPanel } from "@/components/product/workspace-constructor-panel";

type WorkspaceDirectoryItem = {
  slug: string;
  name: string;
  visibility: "personal" | "shared";
  memberCount: number;
  projectCount: number;
  isActive: boolean;
};

type WorkspaceProjectItem = {
  slug: string;
  name: string;
  status: "active" | "archived";
  taskCount: number;
};

type WorkspaceManageValues = {
  id: string;
  slug: string;
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
  agents: { id: string; name: string; enabled: boolean; capabilities?: string[]; sourceSystem?: string; sourceKey?: string }[];
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
  constructor: {
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
  canDelete: boolean;
  workspaces: WorkspaceDirectoryItem[];
  projects: WorkspaceProjectItem[];
};

export function WorkspaceManageForm({ workspace }: { workspace: WorkspaceManageValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaved, setCreateSaved] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSaved, setMoveSaved] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaved, setDeleteSaved] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [isSaving, startSaving] = useTransition();
  const [isCreating, startCreating] = useTransition();
  const [isMoving, startMoving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const availableTargetWorkspaces = useMemo(
    () => workspace.workspaces.filter((item) => item.slug !== workspace.slug),
    [workspace.workspaces, workspace.slug]
  );

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
    startSaving(() => {
      router.refresh();
    });
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("newWorkspaceName") ?? ""),
      visibility: String(formData.get("newWorkspaceVisibility") ?? "personal") as "personal" | "shared"
    };

    if (!payload.name.trim()) {
      setCreateSaved(null);
      setCreateError("Workspace name is required.");
      return;
    }

    setCreateError(null);
    setCreateSaved(null);

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setCreateError(result?.error?.message ?? "Workspace could not be created.");
      return;
    }

    event.currentTarget.reset();
    setCreateSaved(`Created ${result?.workspace?.name ?? "workspace"}.`);
    startCreating(() => {
      router.replace("/manage-workspace");
      router.refresh();
    });
  }

  async function handleMoveProject(projectSlug: string) {
    const targetWorkspaceSlug = moveTargets[projectSlug];

    if (!targetWorkspaceSlug) {
      setMoveSaved(null);
      setMoveError("Choose a target workspace first.");
      return;
    }

    setMoveError(null);
    setMoveSaved(null);

    const response = await fetch("/api/workspaces/projects/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ projectSlug, targetWorkspaceSlug })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setMoveError(result?.error?.message ?? "Project could not be moved.");
      return;
    }

    setMoveSaved(`Moved ${result?.project?.name ?? "project"} to ${result?.project?.workspaceName ?? "the target workspace"}.`);
    setMoveTargets((current) => {
      const next = { ...current };
      delete next[projectSlug];
      return next;
    });
    startMoving(() => {
      router.refresh();
    });
  }

  async function handleDeleteWorkspace() {
    if (!workspace.canDelete) {
      setDeleteSaved(null);
      setDeleteError("Create another workspace before deleting the last one.");
      return;
    }

    if (deleteConfirm.trim() !== workspace.name) {
      setDeleteSaved(null);
      setDeleteError("Type the exact workspace name to confirm deletion.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${workspace.name}? This will permanently delete its remaining projects, tasks, files, memberships, and Constructor settings.`
    );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeleteSaved(null);

    const response = await fetch(`/api/workspaces/${workspace.slug}`, {
      method: "DELETE"
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setDeleteError(result?.error?.message ?? "Workspace could not be deleted.");
      return;
    }

    setDeleteSaved(`Deleted ${workspace.name}.`);
    startDeleting(() => {
      router.replace("/manage-workspace");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div id="workspace-directory">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Directory" title="Workspace directory" description="Create another workspace, switch into it, or review workspace counts." />
          <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr),320px]">
            <div className="space-y-3">
              {workspace.workspaces.map((item) => (
                <div key={item.slug} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{item.name}</p>
                        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
                          {item.visibility}
                        </span>
                        {item.isActive ? (
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-strong)]">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.projectCount} project{item.projectCount === 1 ? "" : "s"} and {item.memberCount} member{item.memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    {!item.isActive ? (
                      <AppButton
                        tone="secondary"
                        onClick={() => {
                          fetch("/api/workspaces/active", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ slug: item.slug })
                          }).then(() => {
                            router.replace("/manage-workspace");
                            router.refresh();
                          });
                        }}
                      >
                        Open workspace
                      </AppButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateWorkspace} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">Create workspace</p>
              <div className="mt-3 space-y-4">
                <div>
                  <label className="section-eyebrow">Name</label>
                  <input name="newWorkspaceName" className="input-control mt-2" placeholder="New workspace" />
                </div>
                <div>
                  <label className="section-eyebrow">Visibility</label>
                  <select name="newWorkspaceVisibility" defaultValue="personal" className="input-control mt-2">
                    <option value="personal">Owner workspace</option>
                    <option value="shared">Shared workspace</option>
                  </select>
                </div>
                <div className="text-sm">
                  {createError ? (
                    <span className="text-rose-600">{createError}</span>
                  ) : createSaved ? (
                    <span className="text-emerald-600">{createSaved}</span>
                  ) : (
                    <span className="text-[var(--text-dim)]">A fresh workspace gets its own owner membership and empty context.</span>
                  )}
                </div>
                <AppButton type="submit" tone="primary" className={isCreating ? "opacity-70" : ""}>
                  {isCreating ? "Creating..." : "Create workspace"}
                </AppButton>
              </div>
            </form>
          </div>
        </Panel>
      </div>

      <div id="workspace-settings">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Basics" title="Workspace settings" description="Name, visibility, and shared context." />
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
              <AppButton type="submit" tone="primary" className={isSaving ? "opacity-70" : ""}>
                {isSaving ? "Saving..." : "Save workspace"}
              </AppButton>
            </div>
          </form>
        </Panel>
      </div>

      <div id="workspace-scope">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Overview" title="Workspace scope" description="A compact snapshot of the current workspace." />
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">Projects</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.projectCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">Members</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.memberCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">Workspace files</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.workspaceAssetCount}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Link href="/members" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">Members</Link>
            <Link href="/projects" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">Projects</Link>
            <Link href="/queue" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">Agent queue</Link>
          </div>
        </Panel>
      </div>

      <div id="workspace-project-transfer">
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow="Project transfer"
            title="Move projects to another workspace"
            description="Use this before deleting a workspace when some projects should survive. Tasks stay with the project, while old assignments are cleared to avoid cross-workspace member links."
          />
          <div className="space-y-4 px-5 py-5">
            {workspace.projects.length ? (
              workspace.projects.map((project) => (
                <div key={project.slug} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 lg:grid-cols-[minmax(0,1fr),260px,auto] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{project.name}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {project.taskCount} task{project.taskCount === 1 ? "" : "s"} • {project.status}
                    </p>
                  </div>
                  <select
                    className="input-control"
                    value={moveTargets[project.slug] ?? ""}
                    onChange={(event) => setMoveTargets((current) => ({ ...current, [project.slug]: event.target.value }))}
                    disabled={!availableTargetWorkspaces.length || isMoving}
                  >
                    <option value="">Select target workspace</option>
                    {availableTargetWorkspaces.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <AppButton tone="secondary" onClick={() => handleMoveProject(project.slug)} disabled={!availableTargetWorkspaces.length || isMoving}>
                    {isMoving ? "Moving..." : "Move project"}
                  </AppButton>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--text-muted)]">
                This workspace has no projects to move.
              </div>
            )}

            <div className="text-sm">
              {moveError ? <span className="text-rose-600">{moveError}</span> : moveSaved ? <span className="text-emerald-600">{moveSaved}</span> : <span className="text-[var(--text-dim)]">Move projects one by one into another workspace.</span>}
            </div>
          </div>
        </Panel>
      </div>

      {workspace.assets.length ? <WorkspaceAssetsPanel assets={workspace.assets} /> : null}

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow="Operations"
          title="Constructor and agent operations"
          description="These controls support Constructor connectivity and agent API access. They are operational integrations, not basic workspace profile settings."
        />
        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-dim)]">
            <p className="font-semibold text-[var(--text-strong)]">What belongs here</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Constructor endpoint and token configuration</li>
              <li>Agent API credentials and recent auth activity</li>
              <li>Operational sync and integration troubleshooting</li>
            </ul>
          </div>

          <div id="workspace-constructor">
            <WorkspaceConstructorPanel integration={workspace.constructor} />
          </div>

          {workspace.agentCredentials.length || workspace.authEvents.length ? (
            <div id="workspace-credentials">
              <WorkspaceAgentCredentialsPanel agents={workspace.agents} credentials={workspace.agentCredentials} authEvents={workspace.authEvents} />
            </div>
          ) : null}
        </div>
      </Panel>

      <div id="workspace-danger-zone">
        <Panel className="overflow-hidden border border-rose-200">
          <PanelHeader
            eyebrow="Danger zone"
            title="Delete this workspace"
            description="Deleting a workspace permanently deletes its remaining projects, tasks, files, memberships, and Constructor integration. Move projects first if you want to keep them."
          />
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
              <p>
                Remaining here right now: {workspace.projects.length} project{workspace.projects.length === 1 ? "" : "s"}, {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"}, and {workspace.workspaceAssetCount} workspace file{workspace.workspaceAssetCount === 1 ? "" : "s"}.
              </p>
              {!workspace.canDelete ? <p className="mt-2">You cannot delete the last remaining workspace.</p> : null}
            </div>
            <div>
              <label className="section-eyebrow">Type {workspace.name} to confirm</label>
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="input-control mt-2" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {deleteError ? <span className="text-rose-600">{deleteError}</span> : deleteSaved ? <span className="text-emerald-600">{deleteSaved}</span> : <span className="text-[var(--text-dim)]">This action cannot be undone.</span>}
              </div>
              <AppButton tone="secondary" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={handleDeleteWorkspace} disabled={isDeleting || !workspace.canDelete}>
                {isDeleting ? "Deleting..." : "Delete workspace"}
              </AppButton>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
