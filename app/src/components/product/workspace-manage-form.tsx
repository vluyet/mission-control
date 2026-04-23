"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import type { AttachmentRecord } from "@/lib/demo-data";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { AppButton, Panel, PanelHeader } from "@/components/ui/primitives";
import { WorkspaceAssetsPanel } from "@/components/product/workspace-assets-panel";
import { WorkspaceAgentCredentialsPanel } from "@/components/product/workspace-agent-credentials-panel";
import { WorkspaceConstructorPanel } from "@/components/product/workspace-constructor-panel";
import { LanguageSwitcher } from "@/components/product/language-switcher";
import { useI18n } from "@/components/product/i18n-provider";

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
  const { t } = useI18n();
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
      setError(t("manageWorkspace.workspaceNameRequired"));
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
      setError(result?.error?.message ?? t("manageWorkspace.workspaceCouldNotBeUpdated"));
      return;
    }

    setSaved(t("manageWorkspace.workspaceUpdated"));
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
      setCreateError(t("manageWorkspace.workspaceNameRequired"));
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
      setCreateError(result?.error?.message ?? t("manageWorkspace.workspaceCouldNotBeCreated"));
      return;
    }

    event.currentTarget.reset();
    setCreateSaved(t("manageWorkspace.workspaceCreated", { name: result?.workspace?.name ?? t("manageWorkspace.workspace") }));
    startCreating(() => {
      router.replace("/manage-workspace");
      router.refresh();
    });
  }

  async function handleMoveProject(projectSlug: string) {
    const targetWorkspaceSlug = moveTargets[projectSlug];

    if (!targetWorkspaceSlug) {
      setMoveSaved(null);
      setMoveError(t("manageWorkspace.chooseTargetWorkspaceFirst"));
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
      setMoveError(result?.error?.message ?? t("manageWorkspace.projectCouldNotBeMoved"));
      return;
    }

    setMoveSaved(
      t("manageWorkspace.projectMoved", {
        project: result?.project?.name ?? t("workspaceUi.project").toLowerCase(),
        workspace: result?.project?.workspaceName ?? t("manageWorkspace.workspace").toLowerCase()
      })
    );
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
      setDeleteError(t("manageWorkspace.createAnotherWorkspaceBeforeDeletingLast"));
      return;
    }

    if (deleteConfirm.trim() !== workspace.name) {
      setDeleteSaved(null);
      setDeleteError(t("manageWorkspace.typeExactWorkspaceNameToConfirmDeletion"));
      return;
    }

    const confirmed = window.confirm(t("manageWorkspace.deleteWorkspaceConfirm", { name: workspace.name }));

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
      setDeleteError(result?.error?.message ?? t("manageWorkspace.workspaceCouldNotBeDeleted"));
      return;
    }

    setDeleteSaved(t("manageWorkspace.workspaceDeleted", { name: workspace.name }));
    startDeleting(() => {
      router.replace("/manage-workspace");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div id="workspace-directory">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow={t("manageWorkspace.directory")} title={t("manageWorkspace.workspaceDirectory")} description={t("manageWorkspace.workspaceDirectoryDescription")} />
          <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr),320px]">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]">
              <div className="grid grid-cols-[minmax(0,1.4fr),110px,90px,90px,auto] gap-3 border-b border-[var(--line)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                <span>{t("manageWorkspace.workspace")}</span>
                <span>{t("manageWorkspace.access")}</span>
                <span>{t("manageWorkspace.projects")}</span>
                <span>{t("manageWorkspace.members")}</span>
                <span className="text-right">{t("manageWorkspace.action")}</span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {workspace.workspaces.map((item) => (
                  <div key={item.slug} className="grid grid-cols-[minmax(0,1.4fr),110px,90px,90px,auto] gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[var(--text-strong)]">{item.name}</p>
                        {item.isActive ? (
                          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-strong)]">
                            {t("manageWorkspace.active")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-dim)]">{item.slug}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
                        {item.visibility === "personal" ? t("manageWorkspace.personal") : t("manageWorkspace.shared")}
                      </span>
                    </div>
                    <div className="flex items-center text-[var(--text-muted)]">{item.projectCount}</div>
                    <div className="flex items-center text-[var(--text-muted)]">{item.memberCount}</div>
                    <div className="flex items-center justify-end">
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
                          {t("manageWorkspace.open")}
                        </AppButton>
                      ) : (
                        <span className="text-xs font-medium text-[var(--text-dim)]">{t("manageWorkspace.current")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateWorkspace} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">{t("manageWorkspace.createWorkspace")}</p>
              <div className="mt-3 space-y-4">
                <div>
                  <label className="section-eyebrow">{t("manageWorkspace.name")}</label>
                  <input name="newWorkspaceName" className="input-control mt-2" placeholder={t("manageWorkspace.newWorkspace")} />
                </div>
                <div>
                  <label className="section-eyebrow">{t("manageWorkspace.visibility")}</label>
                  <select name="newWorkspaceVisibility" defaultValue="personal" className="input-control mt-2">
                    <option value="personal">{t("manageWorkspace.ownerWorkspace")}</option>
                    <option value="shared">{t("manageWorkspace.sharedWorkspace")}</option>
                  </select>
                </div>
                <div className="text-sm">
                  {createError ? (
                    <span className="text-rose-600">{createError}</span>
                  ) : createSaved ? (
                    <span className="text-emerald-600">{createSaved}</span>
                  ) : (
                    <span className="text-[var(--text-dim)]">{t("manageWorkspace.freshWorkspaceHint")}</span>
                  )}
                </div>
                <AppButton type="submit" tone="primary" className={isCreating ? "opacity-70" : ""}>
                  {isCreating ? t("manageWorkspace.creating") : t("manageWorkspace.createWorkspaceAction")}
                </AppButton>
              </div>
            </form>
          </div>
        </Panel>
      </div>

      <div id="workspace-settings">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow={t("manageWorkspace.basics")} title={t("manageWorkspace.workspaceSettings")} description={t("manageWorkspace.workspaceSettingsDescription")} />
          <div className="border-b border-[var(--line)] px-5 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),280px] xl:items-end">
              <div>
                <p className="section-eyebrow">{t("manageWorkspace.languageSettings")}</p>
                <h3 className="mt-1 text-base font-semibold text-[var(--text-strong)]">{t("manageWorkspace.languageSettingsTitle")}</h3>
                <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{t("manageWorkspace.languageSettingsDescription")}</p>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),220px]">
              <div>
                <label className="section-eyebrow">{t("manageWorkspace.name")}</label>
                <input name="name" defaultValue={workspace.name} className="input-control mt-2" />
              </div>
              <div>
                <label className="section-eyebrow">{t("manageWorkspace.visibility")}</label>
                <select name="visibility" defaultValue={workspace.visibility} className="input-control mt-2">
                  <option value="personal">{t("manageWorkspace.ownerWorkspace")}</option>
                  <option value="shared">{t("manageWorkspace.sharedWorkspace")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="section-eyebrow">{t("manageWorkspace.contextTitle")}</label>
              <input name="contextTitle" defaultValue={workspace.contextTitle} className="input-control mt-2" />
            </div>

            <div>
              <label className="section-eyebrow">{t("manageWorkspace.contextSummary")}</label>
              <MarkdownEditor
                name="contextSummary"
                defaultValue={workspace.contextSummary}
                className="mt-2"
                minHeight="140px"
                ariaLabel={t("manageWorkspace.contextSummary")}
              />
            </div>

            <div>
              <label className="section-eyebrow">{t("manageWorkspace.contextBullets")}</label>
              <MarkdownEditor
                name="contextBullets"
                defaultValue={workspace.contextBullets.join("\n")}
                className="mt-2"
                minHeight="160px"
                ariaLabel={t("manageWorkspace.contextBullets")}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {error ? <span className="text-rose-600">{error}</span> : saved ? <span className="text-emerald-600">{saved}</span> : <span className="text-[var(--text-dim)]">{t("manageWorkspace.workspaceSettingsHint")}</span>}
              </div>
              <AppButton type="submit" tone="primary" className={isSaving ? "opacity-70" : ""}>
                {isSaving ? t("manageWorkspace.saving") : t("manageWorkspace.saveWorkspace")}
              </AppButton>
            </div>
          </form>
        </Panel>
      </div>

      <div id="workspace-scope">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow={t("manageWorkspace.overview")} title={t("manageWorkspace.workspaceScope")} description={t("manageWorkspace.workspaceScopeDescription")} />
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">{t("manageWorkspace.projects")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.projectCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">{t("manageWorkspace.members")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.memberCount}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="section-eyebrow">{t("manageWorkspace.workspaceFiles")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{workspace.workspaceAssetCount}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Link href="/members" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">{t("manageWorkspace.members")}</Link>
            <Link href="/projects" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">{t("manageWorkspace.projects")}</Link>
            <Link href="/queue" className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-strong)] hover:border-[var(--line-strong)]">{t("manageWorkspace.agentQueue")}</Link>
          </div>
        </Panel>
      </div>

      <div id="workspace-project-transfer">
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow={t("manageWorkspace.projectTransfer")}
            title={t("manageWorkspace.moveProjectsToAnotherWorkspace")}
            description={t("manageWorkspace.moveProjectsDescription")}
          />
          <div className="space-y-4 px-5 py-5">
            {workspace.projects.length ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]">
                <div className="grid grid-cols-[minmax(0,1.4fr),90px,minmax(180px,240px),auto] gap-3 border-b border-[var(--line)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
                  <span>{t("workspaceUi.project")}</span>
                  <span>{t("manageWorkspace.tasks")}</span>
                  <span>{t("manageWorkspace.moveTo")}</span>
                  <span className="text-right">{t("manageWorkspace.action")}</span>
                </div>
                <div className="divide-y divide-[var(--line)]">
                  {workspace.projects.map((project) => (
                    <div key={project.slug} className="grid grid-cols-[minmax(0,1.4fr),90px,minmax(180px,240px),auto] gap-3 px-4 py-3 text-sm lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-[var(--text-strong)]">{project.name}</p>
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
                            {project.status === "active" ? t("manageWorkspace.active") : t("manageWorkspace.archived")}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-[var(--text-dim)]">{project.slug}</p>
                      </div>
                      <div className="flex items-center text-[var(--text-muted)]">{project.taskCount}</div>
                      <select
                        className="input-control"
                        value={moveTargets[project.slug] ?? ""}
                        onChange={(event) => setMoveTargets((current) => ({ ...current, [project.slug]: event.target.value }))}
                        disabled={!availableTargetWorkspaces.length || isMoving}
                      >
                        <option value="">{t("manageWorkspace.selectTargetWorkspace")}</option>
                        {availableTargetWorkspaces.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end">
                        <AppButton tone="secondary" onClick={() => handleMoveProject(project.slug)} disabled={!availableTargetWorkspaces.length || isMoving}>
                          {isMoving ? t("manageWorkspace.moving") : t("manageWorkspace.move")}
                        </AppButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--text-muted)]">
                {t("manageWorkspace.noProjectsToMove")}
              </div>
            )}

            <div className="text-sm">
              {moveError ? <span className="text-rose-600">{moveError}</span> : moveSaved ? <span className="text-emerald-600">{moveSaved}</span> : <span className="text-[var(--text-dim)]">{t("manageWorkspace.moveProjectsHint")}</span>}
            </div>
          </div>
        </Panel>
      </div>

      {workspace.assets.length ? <WorkspaceAssetsPanel assets={workspace.assets} /> : null}

      <Panel className="overflow-hidden">
        <PanelHeader
          eyebrow={t("manageWorkspace.operations")}
          title={t("manageWorkspace.constructorAndAgentOperations")}
          description={t("manageWorkspace.operationsDescription")}
        />
        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-dim)]">
            <p className="font-semibold text-[var(--text-strong)]">{t("manageWorkspace.whatBelongsHere")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t("manageWorkspace.constructorEndpointAndToken")}</li>
              <li>{t("manageWorkspace.agentCredentialsAndAuthActivity")}</li>
              <li>{t("manageWorkspace.operationalSyncAndTroubleshooting")}</li>
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
            eyebrow={t("manageWorkspace.dangerZone")}
            title={t("manageWorkspace.deleteThisWorkspace")}
            description={t("manageWorkspace.deleteWorkspaceDescription")}
          />
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
              <p>
                {t("manageWorkspace.remainingHereNow", {
                  projects: workspace.projects.length,
                  projectLabel: workspace.projects.length === 1 ? t("manageWorkspace.projectCountLabel") : t("manageWorkspace.projectCountLabelPlural"),
                  members: workspace.memberCount,
                  memberLabel: workspace.memberCount === 1 ? t("manageWorkspace.memberCountLabel") : t("manageWorkspace.memberCountLabelPlural"),
                  files: workspace.workspaceAssetCount,
                  fileLabel: workspace.workspaceAssetCount === 1 ? t("manageWorkspace.workspaceFileCountLabel") : t("manageWorkspace.workspaceFileCountLabelPlural")
                })}
              </p>
              {!workspace.canDelete ? <p className="mt-2">{t("manageWorkspace.cannotDeleteLastWorkspace")}</p> : null}
            </div>
            <div>
              <label className="section-eyebrow">{t("manageWorkspace.typeToConfirm", { name: workspace.name })}</label>
              <input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="input-control mt-2" />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {deleteError ? <span className="text-rose-600">{deleteError}</span> : deleteSaved ? <span className="text-emerald-600">{deleteSaved}</span> : <span className="text-[var(--text-dim)]">{t("manageWorkspace.actionCannotBeUndone")}</span>}
              </div>
              <AppButton tone="secondary" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={handleDeleteWorkspace} disabled={isDeleting || !workspace.canDelete}>
                {isDeleting ? t("manageWorkspace.deletingWorkspace") : t("manageWorkspace.deleteWorkspaceAction")}
              </AppButton>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
