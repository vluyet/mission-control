import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type {
  AttachmentRecord,
  ContextBlock,
  ShellCounts,
  WorkspaceOption,
  WorkspaceSummary
} from "@/lib/demo-data";
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

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function mapContextBlock(value: unknown, fallbackTitle: string): ContextBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: fallbackTitle, summary: "", bullets: [] };
  }

  const record = value as Record<string, unknown>;
  return {
    title: typeof record.title === "string" && record.title.trim() ? record.title : fallbackTitle,
    summary: typeof record.summary === "string" ? record.summary : "",
    bullets: Array.isArray(record.bullets)
      ? record.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  };
}

function mapWorkspaceOption(workspace: {
  slug: string;
  name: string;
  memberships: Array<{ id: string }>;
  projects: Array<{ id: string }>;
}): WorkspaceOption {
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
}): WorkspaceSummary {
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
}): AttachmentRecord {
  const previewable = asset.mimeType.startsWith("image/") || asset.mimeType === "application/pdf";
  return {
    id: asset.id,
    name: asset.originalName,
    mimeType: asset.mimeType,
    sizeLabel: `${Math.max(1, Math.round(asset.sizeBytes / 1024))} KB`,
    artifactType: asset.assetType,
    author: asset.author?.name ?? "Workspace Owner",
    uploadedAt: formatRelativeTime(asset.createdAt),
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
}) {
  return {
    id: credential.id,
    name: credential.name,
    scopes: credential.scopes,
    enabled: credential.enabled,
    agentName: credential.membership?.name ?? "Unknown agent",
    lastUsedAt: credential.lastUsedAt ? formatRelativeTime(credential.lastUsedAt) : "Never",
    createdAt: formatRelativeTime(credential.createdAt)
  };
}

function mapAuthEvent(event: {
  id: string;
  actorType: string;
  actorLabel: string;
  eventType: string;
  detail: string;
  createdAt: Date;
}) {
  return {
    id: event.id,
    actorType: event.actorType,
    actorLabel: event.actorLabel,
    eventType: event.eventType,
    detail: event.detail,
    time: formatRelativeTime(event.createdAt)
  };
}

export async function getWorkspaceShellDataForUi() {
  const [activeWorkspace, workspaces] = await Promise.all([
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
    })
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
    currentWorkspace: mapWorkspaceSummary(currentWorkspace),
    workspaces: workspaces.map(mapWorkspaceOption),
    shellCounts,
    activeTaskHref: activeTask ? `/projects/${activeTask.project.slug}/tasks/${activeTask.id}` : "/projects"
  };
}

export async function getWorkspaceManagementDataForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const [workspace, constructorIntegration, taskAttachmentsCount, workspaceAssetsCount, humanCount, agentCount, credentials, authEvents] = await Promise.all([
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
    db.authEvent.findMany({ where: { workspaceId: activeWorkspace.id }, orderBy: { createdAt: "desc" }, take: 8 })
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
      assets: workspace.assets.map(mapWorkspaceAsset),
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
      agentCredentials: credentials.map(mapAgentCredential),
      authEvents: authEvents.map(mapAuthEvent)
    }
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
