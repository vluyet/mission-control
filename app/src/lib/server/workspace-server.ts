import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type {
  AttachmentRecord,
  ShellCounts,
  WorkspaceOption,
  WorkspaceSummary
} from "@/lib/demo-data";
import { mapContextBlock } from "@/lib/context-block";
import { getOwnerAuthConfig } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translator";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";

async function getActiveWorkspaceSlug() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value || DEFAULT_WORKSPACE_SLUG;
}

async function getActiveWorkspaceRecord() {
  const activeSlug = await getActiveWorkspaceSlug();

  const workspace =
    (await db.workspace.findFirst({ where: { slug: activeSlug } })) ??
    (await db.workspace.findFirst({ where: { slug: DEFAULT_WORKSPACE_SLUG } })) ??
    (await db.workspace.findFirst({ orderBy: { createdAt: "asc" } }));

  return workspace;
}

function formatRelativeTime(date: Date, t: Translator) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) return t("taskServer.justNow");
  if (minutes < 60) return t("taskServer.minutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("taskServer.hoursAgo", { count: hours });
  const days = Math.round(hours / 24);
  return t("taskServer.daysAgo", { count: days });
}

function mapWorkspaceOption(workspace: {
  slug: string;
  name: string;
  memberships: Array<{ id: string }>;
  projects: Array<{ id: string }>;
}, t: Translator): WorkspaceOption {
  return {
    slug: workspace.slug,
    name: workspace.name,
    plan: `${workspace.projects.length} active project${workspace.projects.length === 1 ? "" : "s"}`,
    progress: `${workspace.memberships.length} member${workspace.memberships.length === 1 ? "" : "s"}`,
    memberCount: workspace.memberships.length,
    projectCount: workspace.projects.length
  };
}

function mapWorkspaceSummary(workspace: {
  slug: string;
  name: string;
  memberships: Array<{ id: string }>;
  projects: Array<{ id: string }>;
}, t: Translator): WorkspaceSummary {
  return {
    slug: workspace.slug,
    name: workspace.name,
    plan: `${workspace.projects.length} active project${workspace.projects.length === 1 ? "" : "s"}`,
    progress: `${workspace.memberships.length} member${workspace.memberships.length === 1 ? "" : "s"}`
  };
}

function mapWorkspaceAsset(asset: {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  assetType: string;
  createdAt: Date;
  author?: { name: string | null } | null;
}, t: Translator): AttachmentRecord {
  const previewable = asset.mimeType.startsWith("image/") || asset.mimeType === "application/pdf";
  return {
    id: asset.id,
    name: asset.originalName,
    mimeType: asset.mimeType,
    sizeLabel: `${Math.max(1, Math.round(asset.sizeBytes / 1024))} KB`,
    artifactType: asset.assetType,
    author: asset.author?.name ?? t("taskServer.workspaceOwner"),
    uploadedAt: formatRelativeTime(asset.createdAt, t),
    href: `/api/workspace-assets/${asset.id}`,
    previewable,
    previewHref: previewable ? `/api/workspace-assets/${asset.id}/preview` : undefined,
    previewKind: asset.mimeType.startsWith("image/") ? "image" : previewable ? "document" : undefined
  };
}

function mapAgentCredential(credential: {
  id: string;
  name: string;
  scopes: string[];
  enabled: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  membership?: { name: string | null } | null;
}, t: Translator) {
  return {
    id: credential.id,
    name: credential.name,
    scopes: credential.scopes,
    enabled: credential.enabled,
    agentName: credential.membership?.name ?? t("taskServer.unassigned"),
    lastUsedAt: credential.lastUsedAt ? formatRelativeTime(credential.lastUsedAt, t) : t("taskServer.noDate"),
    createdAt: formatRelativeTime(credential.createdAt, t)
  };
}

function mapAuthEvent(event: {
  id: string;
  actorType: string;
  actorLabel: string;
  eventType: string;
  detail: string;
  createdAt: Date;
}, t: Translator) {
  return {
    id: event.id,
    actorType: event.actorType,
    actorLabel: event.actorLabel,
    eventType: event.eventType,
    detail: event.detail,
    time: formatRelativeTime(event.createdAt, t)
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function buildUniqueWorkspaceSlug(name: string) {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let index = 2;

  while (await db.workspace.findFirst({ where: { slug } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

async function buildUniqueProjectSlug(targetWorkspaceId: string, baseValue: string) {
  const baseSlug = slugify(baseValue) || "project";
  let slug = baseSlug;
  let index = 2;

  while (await db.project.findFirst({ where: { workspaceId: targetWorkspaceId, slug } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

async function getOwnerUser() {
  const ownerEmail = getOwnerAuthConfig().email;
  const { t } = await getRequestI18n();

  return db.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      displayName: t("taskServer.workspaceOwner")
    }
  });
}

async function getDefaultHumanMembership(workspaceId: string) {
  const ownerEmail = getOwnerAuthConfig().email;

  return (
    (await db.membership.findFirst({
      where: {
        workspaceId,
        kind: "human",
        enabled: true,
        OR: [{ user: { email: ownerEmail } }, { userId: { not: null } }]
      },
      orderBy: { createdAt: "asc" }
    })) ??
    (await db.membership.findFirst({
      where: {
        workspaceId,
        kind: "human",
        enabled: true
      },
      orderBy: { createdAt: "asc" }
    }))
  );
}

async function getConstructorDispatchableAgentMemberships(workspaceId: string) {
  return db.membership.findMany({
    where: {
      workspaceId,
      kind: "agent",
      enabled: true,
      sourceSystem: "constructor"
    },
    select: { id: true }
  });
}

export async function getWorkspaceShellDataForUi() {
  const [activeWorkspace, workspaces, { t }] = await Promise.all([
    getActiveWorkspaceRecord(),
    db.workspace.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        memberships: { select: { id: true } },
        projects: {
          where: { status: "active" },
          select: { id: true }
        }
      }
    }),
    getRequestI18n()
  ]);

  if (!activeWorkspace) {
    return null;
  }

  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspace.id) ??
    workspaces.find((workspace) => workspace.slug === DEFAULT_WORKSPACE_SLUG);

  if (!currentWorkspace) {
    return null;
  }

  const [projectsCount, membersCount, myTasksCount, queuesCount, activeTask] = await Promise.all([
    db.project.count({ where: { workspaceId: currentWorkspace.id, status: "active" } }),
    db.membership.count({ where: { workspaceId: currentWorkspace.id, enabled: true } }),
    db.task.count({
      where: {
        project: { workspaceId: currentWorkspace.id },
        status: { not: "done" },
        assignee: { is: { kind: "human", enabled: true } }
      }
    }),
    db.task.count({
      where: {
        project: { workspaceId: currentWorkspace.id },
        status: { in: ["todo", "in_progress", "review", "blocked"] },
        assignee: { is: { kind: "agent", enabled: true } }
      }
    }),
    db.task.findFirst({
      where: {
        project: { workspaceId: currentWorkspace.id },
        status: { not: "done" }
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        project: { select: { slug: true } }
      }
    })
  ]);

  const shellCounts: ShellCounts = {
    myTasks: String(myTasksCount),
    projects: String(projectsCount),
    members: String(membersCount),
    queues: String(queuesCount)
  };

  return {
    currentWorkspace: mapWorkspaceSummary(currentWorkspace, t),
    workspaces: workspaces.map((workspace) => mapWorkspaceOption(workspace, t)),
    shellCounts,
    activeTaskHref: activeTask ? `/projects/${activeTask.project.slug}/tasks/${activeTask.id}` : "/projects"
  };
}

export async function getWorkspaceManagementDataForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const [workspace, constructorIntegration, taskAttachmentsCount, workspaceAssetsCount, humanCount, agentCount, credentials, authEvents, allWorkspaces, projects, { t }] = await Promise.all([
    db.workspace.findFirst({
      where: { id: activeWorkspace.id },
      include: {
        memberships: { orderBy: { createdAt: "asc" } },
        projects: { where: { status: "active" }, orderBy: { createdAt: "asc" } },
        assets: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true } } }
        }
      }
    }),
    db.workspaceConstructorIntegration.findUnique({ where: { workspaceId: activeWorkspace.id } }),
    db.attachment.count({ where: { task: { project: { workspaceId: activeWorkspace.id } } } }),
    db.workspaceAsset.count({ where: { workspaceId: activeWorkspace.id } }),
    db.membership.count({ where: { workspaceId: activeWorkspace.id, enabled: true, kind: "human" } }),
    db.membership.count({ where: { workspaceId: activeWorkspace.id, enabled: true, kind: "agent" } }),
    db.agentCredential.findMany({
      where: { membership: { workspaceId: activeWorkspace.id, kind: "agent" } },
      include: { membership: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    db.authEvent.findMany({ where: { workspaceId: activeWorkspace.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.workspace.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        memberships: { where: { enabled: true }, select: { id: true } },
        projects: { where: { status: "active" }, select: { id: true } }
      }
    }),
    db.project.findMany({
      where: { workspaceId: activeWorkspace.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: {
        tasks: { select: { id: true } }
      }
    }),
    getRequestI18n()
  ]);

  if (!workspace) {
    return null;
  }

  const context = mapContextBlock(workspace.context, "Workspace context");

  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      visibility: workspace.visibility,
      contextTitle: context.title,
      contextSummary: context.summary,
      contextBullets: context.bullets,
      projectCount: workspace.projects.length,
      memberCount: workspace.memberships.length,
      humanCount,
      agentCount,
      attachmentCount: taskAttachmentsCount,
      workspaceAssetCount: workspaceAssetsCount,
      assets: workspace.assets.map((asset) => mapWorkspaceAsset(asset, t)),
      agents: workspace.memberships
        .filter((member) => member.kind === "agent" && member.enabled)
        .map((member) => ({
          id: member.id,
          name: member.name,
          enabled: member.enabled,
          capabilities: member.capabilities,
          sourceSystem: member.sourceSystem ?? undefined,
          sourceKey: member.sourceKey ?? undefined
        })),
      constructor: constructorIntegration
        ? {
            id: constructorIntegration.id,
            label: constructorIntegration.label ?? "",
            baseUrl: constructorIntegration.baseUrl,
            enabled: constructorIntegration.enabled,
            apiToken: constructorIntegration.apiToken ?? null,
            callbackToken: constructorIntegration.callbackToken ?? null,
            apiTokenConfigured: Boolean(constructorIntegration.apiToken) || Boolean(process.env.CONSTRUCTOR_API_TOKEN?.trim()),
            callbackTokenConfigured: Boolean(constructorIntegration.callbackToken),
            lastSyncAt: constructorIntegration.lastSyncAt ? constructorIntegration.lastSyncAt.toISOString() : null,
            lastSyncStatus: constructorIntegration.lastSyncStatus ?? null,
            lastSyncError: constructorIntegration.lastSyncError ?? null
          }
        : null,
      agentCredentials: credentials.map((credential) => mapAgentCredential(credential, t)),
      authEvents: authEvents.map((event) => mapAuthEvent(event, t)),
      canDelete: allWorkspaces.length > 1,
      workspaces: allWorkspaces.map((item) => ({
        slug: item.slug,
        name: item.name,
        visibility: item.visibility,
        memberCount: item.memberships.length,
        projectCount: item.projects.length,
        isActive: item.id === workspace.id
      })),
      projects: projects.map((project) => ({
        slug: project.slug,
        name: project.name,
        status: project.status,
        taskCount: project.tasks.length
      }))
    }
  };
}

export async function createWorkspaceInDb(payload: {
  name: string;
  visibility?: "personal" | "shared";
}) {
  const name = payload.name.trim();

  if (!name) {
    return null;
  }

  const [slug, owner, { t }] = await Promise.all([buildUniqueWorkspaceSlug(name), getOwnerUser(), getRequestI18n()]);

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      visibility: payload.visibility ?? "personal",
      context: {
        title: t("seededContext.workspaceTitle"),
        summary: "",
        bullets: []
      },
      memberships: {
        create: {
          userId: owner.id,
          name: owner.displayName,
          kind: "human",
          workspaceRole: "owner",
          email: owner.email,
          roleLabel: "Owner",
          capabilities: [],
          agentPermissions: [],
          enabled: true
        }
      }
    }
  });

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    visibility: workspace.visibility
  };
}

export async function moveProjectToWorkspaceInDb(projectSlug: string, targetWorkspaceSlug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return { error: "WORKSPACE_NOT_FOUND" } as const;
  }

  const [project, targetWorkspace] = await Promise.all([
    db.project.findFirst({
      where: { workspaceId: activeWorkspace.id, slug: projectSlug },
      include: { workspace: true }
    }),
    db.workspace.findFirst({ where: { slug: targetWorkspaceSlug } })
  ]);

  if (!project) {
    return { error: "PROJECT_NOT_FOUND" } as const;
  }

  if (!targetWorkspace) {
    return { error: "TARGET_WORKSPACE_NOT_FOUND" } as const;
  }

  if (targetWorkspace.id === project.workspaceId) {
    return { error: "TARGET_WORKSPACE_SAME" } as const;
  }

  const [targetOwnerMembership, constructorAgents, nextSlug] = await Promise.all([
    getDefaultHumanMembership(targetWorkspace.id),
    getConstructorDispatchableAgentMemberships(targetWorkspace.id),
    buildUniqueProjectSlug(targetWorkspace.id, project.slug)
  ]);

  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: project.id },
      data: {
        workspaceId: targetWorkspace.id,
        slug: nextSlug
      }
    });

    await tx.projectMembership.deleteMany({ where: { projectId: project.id } });
    await tx.task.updateMany({ where: { projectId: project.id }, data: { assigneeId: null, reviewerId: null } });

    if (targetOwnerMembership) {
      await tx.projectMembership.create({
        data: {
          projectId: project.id,
          membershipId: targetOwnerMembership.id,
          role: "lead"
        }
      });
    }

    if (constructorAgents.length) {
      await tx.projectMembership.createMany({
        data: constructorAgents.map((membership) => ({
          projectId: project.id,
          membershipId: membership.id,
          role: "member" as const
        })),
        skipDuplicates: true
      });
    }
  });

  return {
    project: {
      slug: nextSlug,
      name: project.name,
      workspaceSlug: targetWorkspace.slug,
      workspaceName: targetWorkspace.name
    }
  };
}

export async function deleteWorkspaceInDb(workspaceSlug: string) {
  const [workspace, allWorkspaces] = await Promise.all([
    db.workspace.findFirst({
      where: { slug: workspaceSlug },
      include: {
        projects: { select: { id: true } },
        memberships: { select: { id: true } }
      }
    }),
    db.workspace.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  if (!workspace) {
    return { error: "WORKSPACE_NOT_FOUND" } as const;
  }

  if (allWorkspaces.length <= 1) {
    return { error: "LAST_WORKSPACE" } as const;
  }

  const fallbackWorkspace = allWorkspaces.find((item) => item.id !== workspace.id);

  await db.workspace.delete({ where: { id: workspace.id } });

  return {
    deletedWorkspace: {
      slug: workspace.slug,
      name: workspace.name,
      projectCount: workspace.projects.length,
      memberCount: workspace.memberships.length
    },
    fallbackWorkspace: fallbackWorkspace
      ? {
          slug: fallbackWorkspace.slug,
          name: fallbackWorkspace.name
        }
      : null
  };
}

export async function updateActiveWorkspaceInDb(payload: {
  name: string;
  visibility?: "personal" | "shared";
  contextTitle?: string;
  contextSummary?: string;
  contextBullets?: string[];
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const current = await db.workspace.findFirst({ where: { id: activeWorkspace.id } });

  if (!current) {
    return null;
  }

  const currentContext = current.context && typeof current.context === "object" && !Array.isArray(current.context)
    ? (current.context as Record<string, unknown>)
    : {};

  const nextTitle = payload.contextTitle?.trim() || String(currentContext.title ?? "Workspace context");
  const nextSummary = payload.contextSummary?.trim() || String(currentContext.summary ?? "");
  const nextBullets = (payload.contextBullets ?? []).map((item) => item.trim()).filter(Boolean);

  const workspace = await db.workspace.update({
    where: { id: current.id },
    data: {
      name: payload.name.trim(),
      visibility: payload.visibility ?? current.visibility,
      context: {
        title: nextTitle,
        summary: nextSummary,
        bullets: nextBullets
      }
    }
  });

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    visibility: workspace.visibility,
    context: workspace.context
  };
}

export async function getActiveWorkspaceConstructorIntegrationRecord() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  return db.workspaceConstructorIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });
}

export async function getActiveWorkspaceConstructorIntegration() {
  const integration = await getActiveWorkspaceConstructorIntegrationRecord();

  if (!integration) {
    return null;
  }

  return {
    id: integration.id,
    label: integration.label ?? "",
    baseUrl: integration.baseUrl,
    enabled: integration.enabled,
    apiToken: integration.apiToken ?? null,
    callbackToken: integration.callbackToken ?? null,
    apiTokenConfigured: Boolean(integration.apiToken) || Boolean(process.env.CONSTRUCTOR_API_TOKEN?.trim()),
    callbackTokenConfigured: Boolean(integration.callbackToken),
    lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toISOString() : null,
    lastSyncStatus: integration.lastSyncStatus ?? null,
    lastSyncError: integration.lastSyncError ?? null
  };
}

export async function upsertActiveWorkspaceConstructorIntegrationInDb(payload: {
  label?: string;
  baseUrl: string;
  apiToken?: string;
  callbackToken?: string;
  enabled?: boolean;
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const existing = await db.workspaceConstructorIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  const callbackToken = payload.callbackToken === undefined
    ? existing?.callbackToken ?? null
    : payload.callbackToken.trim() || null;
  const apiToken = payload.apiToken === undefined
    ? existing?.apiToken ?? null
    : payload.apiToken.trim() || null;

  const integration = await db.workspaceConstructorIntegration.upsert({
    where: { workspaceId: activeWorkspace.id },
    update: {
      label: payload.label?.trim() || null,
      baseUrl: payload.baseUrl.trim().replace(/\/+$/, ""),
      apiToken,
      callbackToken,
      enabled: payload.enabled ?? existing?.enabled ?? true
    },
    create: {
      workspaceId: activeWorkspace.id,
      label: payload.label?.trim() || null,
      baseUrl: payload.baseUrl.trim().replace(/\/+$/, ""),
      apiToken,
      callbackToken,
      enabled: payload.enabled ?? true
    }
  });

  return {
    id: integration.id,
    label: integration.label ?? "",
    baseUrl: integration.baseUrl,
    enabled: integration.enabled,
    apiToken: integration.apiToken ?? null,
    callbackToken: integration.callbackToken ?? null,
    apiTokenConfigured: Boolean(integration.apiToken) || Boolean(process.env.CONSTRUCTOR_API_TOKEN?.trim()),
    callbackTokenConfigured: Boolean(integration.callbackToken),
    lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toISOString() : null,
    lastSyncStatus: integration.lastSyncStatus ?? null,
    lastSyncError: integration.lastSyncError ?? null
  };
}
