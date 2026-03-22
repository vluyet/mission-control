import { db } from "@/lib/db";
import { resolveTaskContext } from "@/lib/context-resolver";
import {
  readAttachmentFile,
  readWorkspaceAssetFile,
  storeAttachmentFile,
  storeWorkspaceAssetFile
} from "@/lib/attachment-storage";
import { createAgentAccessToken, getOwnerAuthConfig, hashAgentAccessToken, type AgentScope } from "@/lib/auth";
import { cookies } from "next/headers";
import type { ActivityFeedItem, AttachmentRecord, ContextBlock, Member, Metric, ProjectSummary, TaskRecord, WatcherRecord } from "@/lib/demo-data";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";
export {
  dispatchTaskToOpenClawInDb,
  handleOpenClawTaskWebhookInDb,
  syncActiveWorkspaceOpenClawAgentsInDb
} from "@/lib/server/openclaw-server";
export {
  getMembersForUi,
  updateAgentPermissionsInDb,
  updateMemberEnabledInDb,
  updateWorkspaceRoleInDb
} from "@/lib/server/members-server";
export {
  getActiveWorkspaceOpenClawIntegration,
  getWorkspaceManagementDataForUi,
  getWorkspaceShellDataForUi,
  updateActiveWorkspaceInDb,
  upsertActiveWorkspaceOpenClawIntegrationInDb
} from "@/lib/server/workspace-server";
import {
  createProjectInDb,
  getProjectContextBlockForUi,
  getProjectMembersForUi,
  getProjectsForUi,
  setProjectMembersInDb
} from "@/lib/server/projects-server";
export {
  createProjectInDb,
  getProjectContextBlockForUi,
  getProjectMembersForUi,
  getProjectsForUi,
  setProjectMembersInDb
};
import {
  createTaskInDb,
  getBoardColumnsForUi,
  getMyTasksForUi,
  getTaskCreateFormData,
  getTaskEditFormData,
  getTaskResourceFromDb,
  getTasksForUi,
  getTaskWorkspaceForUi,
  updateTaskInDb
} from "@/lib/server/tasks-server";
export {
  createTaskInDb,
  getBoardColumnsForUi,
  getMyTasksForUi,
  getTaskCreateFormData,
  getTaskEditFormData,
  getTaskResourceFromDb,
  getTasksForUi,
  getTaskWorkspaceForUi,
  updateTaskInDb
};

function formatStatus(status: string): TaskRecord["status"] {
  return status === "in_progress"
    ? "In Progress"
    : status === "review"
      ? "In Review"
      : status === "done"
        ? "Done"
        : status === "blocked"
          ? "Blocked"
          : "Todo";
}

function formatPriority(priority: string): TaskRecord["priority"] {
  return (priority.charAt(0).toUpperCase() + priority.slice(1)) as TaskRecord["priority"];
}

function formatWorkspaceRole(role: string): NonNullable<Member["workspaceRole"]> {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default:
      return "Member";
  }
}

function formatProjectRole(role: string) {
  switch (role) {
    case "lead":
      return "Lead";
    case "observer":
      return "Observer";
    default:
      return "Member";
  }
}

function formatProjectVisibility(visibility: string): NonNullable<ProjectSummary["visibility"]> {
  return visibility === "project_members" ? "Project members" : "Workspace";
}

function formatProjectLifecycle(status: string): NonNullable<ProjectSummary["lifecycle"]> {
  return status === "archived" ? "Archived" : "Active";
}

function formatShortDate(date: Date | null | undefined) {
  if (!date) {
    return "No date";
  }

  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfDate.getTime() - startOfNow.getTime()) / 86400000);

  if (dayDiff === 0) {
    return "Today";
  }

  if (dayDiff === 1) {
    return "Tomorrow";
  }

  if (dayDiff === -1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatRelativeTime(date: Date) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }

  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

function getAttachmentPreviewKind(mimeType: string): AttachmentRecord["previewKind"] | null {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "document";
  }

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return "text";
  }

  return null;
}

function mapContextBlock(value: unknown, fallbackTitle: string): ContextBlock {
  const payload = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return {
    title: typeof payload.title === "string" ? payload.title : fallbackTitle,
    summary: typeof payload.summary === "string" ? payload.summary : "",
    bullets: Array.isArray(payload.bullets) ? payload.bullets.filter((item): item is string => typeof item === "string") : []
  };
}

const HUMAN_STATUS_TRANSITIONS: Record<string, Array<{ value: "todo" | "in_progress" | "review" | "blocked" | "done"; label: string }>> = {
  todo: [
    { value: "in_progress", label: "Start work" },
    { value: "blocked", label: "Mark blocked" },
    { value: "done", label: "Mark done" }
  ],
  in_progress: [
    { value: "review", label: "Move to review" },
    { value: "blocked", label: "Mark blocked" },
    { value: "done", label: "Mark done" },
    { value: "todo", label: "Move back to todo" }
  ],
  review: [
    { value: "in_progress", label: "Resume work" },
    { value: "blocked", label: "Mark blocked" },
    { value: "done", label: "Approve done" }
  ],
  blocked: [
    { value: "todo", label: "Move to todo" },
    { value: "in_progress", label: "Resume work" },
    { value: "done", label: "Close as done" }
  ],
  done: [{ value: "in_progress", label: "Reopen task" }]
};

const AGENT_STATUS_TRANSITIONS: Record<string, Array<{ value: "todo" | "in_progress" | "review" | "blocked" | "done"; label: string }>> = {
  todo: [{ value: "in_progress", label: "Start execution" }],
  in_progress: [
    { value: "review", label: "Move to review" },
    { value: "done", label: "Mark done" },
    { value: "blocked", label: "Mark blocked" }
  ],
  review: [
    { value: "in_progress", label: "Resume work" },
    { value: "done", label: "Approve done" },
    { value: "blocked", label: "Mark blocked" }
  ],
  blocked: [{ value: "in_progress", label: "Resume work" }],
  done: []
};

function getAgentTransitionOptions(status: string) {
  return AGENT_STATUS_TRANSITIONS[status] ?? [];
}

function getHumanTransitionOptions(status: string) {
  return HUMAN_STATUS_TRANSITIONS[status] ?? [];
}

function isAllowedAgentTransition(from: string, to: string) {
  return getAgentTransitionOptions(from).some((option) => option.value === to);
}

function isAllowedHumanTransition(from: string, to: string) {
  return getHumanTransitionOptions(from).some((option) => option.value === to);
}

function agentHasPermission(member: { kind: string; agentPermissions: string[] } | null | undefined, permission: string) {
  if (member?.kind !== "agent") {
    return true;
  }

  const aliases: Record<string, string[]> = {
    comment: ["comment", "task.comments"],
    change_status: ["change_status", "task.transitions"],
    log_execution: ["log_execution", "task.execution"]
  };

  const allowed = aliases[permission] ?? [permission];
  return allowed.some((value) => member.agentPermissions.includes(value));
}

function canOwnTask(member: { enabled: boolean; workspaceRole?: string | null } | null | undefined) {
  return Boolean(member?.enabled && member.workspaceRole !== "viewer");
}

function canOwnProjectTask(member: { enabled: boolean; workspaceRole?: string | null } | null | undefined, projectRole?: string | null) {
  return canOwnTask(member) && projectRole !== "observer";
}

function getAgentCompletionSummary(taskTitle: string, executionSummary: string | null, executionLogs: string[]) {
  const base = executionSummary?.trim() || executionLogs.at(-1)?.trim() || `Completed work on ${taskTitle}.`;
  const highlights = executionLogs.slice(-2).map((line) => `- ${line}`);
  return [base, ...highlights].join("\n");
}

function mapWatcher(membership: {
  id: string;
  name: string;
  kind: string;
}): WatcherRecord {
  return {
    id: membership.id,
    name: membership.name,
    type: membership.kind === "agent" ? "Agent" : "Human"
  };
}

async function logPermissionDenied(taskId: string, actorId: string | null, actorName: string, detail: string) {
  await db.taskActivity.create({
    data: {
      taskId,
      actorId: actorId ?? undefined,
      actorName,
      label: "Permission denied",
      detail
    }
  });
}

async function getActiveWorkspaceSlug() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value || DEFAULT_WORKSPACE_SLUG;
}

async function getActiveWorkspaceRecord() {
  const activeSlug = await getActiveWorkspaceSlug();

  const workspace =
    (await db.workspace.findFirst({
      where: { slug: activeSlug }
    })) ??
    (await db.workspace.findFirst({
      where: { slug: DEFAULT_WORKSPACE_SLUG }
    })) ??
    (await db.workspace.findFirst({
      orderBy: { createdAt: "asc" }
    }));

  return workspace;
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

function buildProjectVisibilityWhere(visibilityMembershipId?: string | null) {
  if (!visibilityMembershipId) {
    return undefined;
  }

  return {
    OR: [
      { visibility: "workspace" as const },
      {
        memberships: {
          some: {
            membershipId: visibilityMembershipId
          }
        }
      }
    ]
  };
}

function mapTaskRecord(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  effort: string | null;
  tags: string[];
  contextHint: string | null;
  blockedReason: string | null;
  dueDate: Date | null;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project: { slug: string; name: string };
  parentTask?: { id: string; title: string } | null;
  childTasks?: { id: string }[];
  assignee: { name: string; kind: string; capabilities: string[]; enabled: boolean; agentPermissions: string[] } | null;
  reviewer?: { name: string } | null;
}): TaskRecord {
  return {
    id: task.id,
    title: task.title,
    projectSlug: task.project.slug,
    project: task.project.name,
    description: task.description ?? "",
    status: formatStatus(task.status),
    priority: formatPriority(task.priority),
    assignee: task.assignee?.name ?? "Unassigned",
    assigneeType: task.assignee?.kind === "agent" ? "Agent" : "Human",
    reviewer: task.reviewer?.name ?? undefined,
    due: formatShortDate(task.dueDate),
    startDate: formatShortDate(task.startDate),
    tags: task.tags,
    effort: (task.effort ?? "S") as TaskRecord["effort"],
    contextHint: task.contextHint ?? "",
    parentTaskId: task.parentTask?.id ?? undefined,
    parentTaskTitle: task.parentTask?.title ?? undefined,
    childCount: task.childTasks?.length ?? 0,
    blockedReason: task.blockedReason ?? undefined,
    dueAt: task.dueDate?.toISOString(),
    startAt: task.startDate?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assigneeCapabilities: task.assignee?.kind === "agent" ? task.assignee.capabilities : undefined,
    assigneeEnabled: task.assignee?.enabled,
    assigneePermissions: task.assignee?.kind === "agent" ? task.assignee.agentPermissions : undefined,
    humanTransitionOptions: getHumanTransitionOptions(task.status),
    transitionOptions: task.assignee?.kind === "agent" ? getAgentTransitionOptions(task.status) : undefined
  };
}

function buildBoardColumns(items: TaskRecord[]) {
  const config: Array<{ title: TaskRecord["status"]; accent: "slate" | "blue" | "gold" | "red" | "emerald" }> = [
    { title: "Todo", accent: "slate" },
    { title: "In Progress", accent: "blue" },
    { title: "In Review", accent: "gold" },
    { title: "Blocked", accent: "red" },
    { title: "Done", accent: "emerald" }
  ];

  return config.map((column) => ({
    title: column.title,
    count: items.filter((task) => task.status === column.title).length,
    accent: column.accent,
    cards: items
      .filter((task) => task.status === column.title)
      .map((task) => ({
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        priority: task.priority,
        eta: task.due,
        effort: task.effort,
        project: task.project,
        tags: task.tags,
        childCount: task.childCount ?? 0,
        parentTaskTitle: task.parentTaskTitle ?? null
      }))
  }));
}

function mapMembership(member: {
  id: string;
  name: string;
  kind: string;
  workspaceRole: string;
  email: string | null;
  avatarUrl: string | null;
  roleLabel: string | null;
  capabilities: string[];
  agentPermissions: string[];
  enabled: boolean;
}) {
  return {
    id: member.id,
    name: member.name,
    type: member.kind === "agent" ? "Agent" : "Human",
    role: member.roleLabel ?? (member.kind === "agent" ? "Agent" : "Member"),
    workspaceRole: formatWorkspaceRole(member.workspaceRole),
    email: member.email,
    avatarUrl: member.avatarUrl,
    capabilities: member.capabilities,
    agentPermissions: member.kind === "agent" ? member.agentPermissions : [],
    active: member.enabled
  };
}

function mapComment(comment: {
  id: string;
  taskId: string;
  authorName: string;
  authorRole: string;
  tone: string;
  body: string;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: comment.authorName,
    role: comment.authorRole,
    tone: comment.tone,
    body: comment.body,
    time: comment.createdAt.toISOString(),
    editedAt: comment.updatedAt && comment.updatedAt.getTime() !== comment.createdAt.getTime() ? comment.updatedAt.toISOString() : undefined
  };
}

function mapAttachment(attachment: {
  id: string;
  originalName: string;
  mimeType: string;
  artifactType: string;
  sizeBytes: number;
  createdAt: Date;
  author?: { name: string } | null;
}): AttachmentRecord {
  const previewKind = getAttachmentPreviewKind(attachment.mimeType);
  return {
    id: attachment.id,
    name: attachment.originalName,
    mimeType: attachment.mimeType,
    artifactType: attachment.artifactType,
    sizeLabel: formatBytes(attachment.sizeBytes),
    href: `/api/attachments/${attachment.id}`,
    previewHref: previewKind ? `/api/attachments/${attachment.id}/preview` : undefined,
    previewKind: previewKind ?? undefined,
    previewable: Boolean(previewKind),
    uploadedAt: formatRelativeTime(attachment.createdAt),
    author: attachment.author?.name ?? undefined
  };
}

function mapWorkspaceAsset(asset: {
  id: string;
  originalName: string;
  mimeType: string;
  assetType: string;
  sizeBytes: number;
  createdAt: Date;
  author: { name: string } | null;
}): AttachmentRecord {
  const previewKind = getAttachmentPreviewKind(asset.mimeType);

  return {
    id: asset.id,
    name: asset.originalName,
    mimeType: asset.mimeType,
    artifactType: asset.assetType,
    sizeLabel: formatBytes(asset.sizeBytes),
    href: `/api/workspace-assets/${asset.id}`,
    previewHref: previewKind ? `/api/workspace-assets/${asset.id}/preview` : undefined,
    previewKind: previewKind ?? undefined,
    previewable: Boolean(previewKind),
    uploadedAt: formatRelativeTime(asset.createdAt),
    author: asset.author?.name ?? undefined
  };
}

function mapAgentCredential(credential: {
  id: string;
  name: string;
  scopes: string[];
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  membership: { name: string };
}) {
  return {
    id: credential.id,
    name: credential.name,
    scopes: credential.scopes,
    enabled: credential.enabled,
    agentName: credential.membership.name,
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

function mapActivity(item: {
  id: string;
  taskId: string;
  actorName: string | null;
  label: string;
  detail: string;
  createdAt: Date;
}) {
  return {
    id: item.id,
    taskId: item.taskId,
    actor: item.actorName,
    label: item.label,
    detail: item.detail,
    time: item.createdAt.toISOString()
  };
}

export async function getWorkspaceContextFromDb() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const workspace = await db.workspace.findFirst({
    where: { id: activeWorkspace.id },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!workspace) {
    return null;
  }

  return {
    workspace: {
      id: workspace.slug,
      name: workspace.name,
      plan: workspace.visibility,
      progress: `${workspace.memberships.length} members`,
      context: workspace.context,
      members: workspace.memberships.map(mapMembership)
    }
  };
}

export async function getProjectContextFromDb(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: {
      slug,
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {})
    },
    include: {
      workspace: true,
      tasks: true
    }
  });

  if (!project) {
    return null;
  }

  return {
    project: {
      slug: project.slug,
      name: project.name,
      description: project.description,
      status: project.status,
      workspace_id: project.workspace.slug,
      context: project.context,
      inherited_workspace_context: project.workspace.context,
      task_count: project.tasks.length
    }
  };
}

export async function getTaskContextFromDb(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  return {
    task_id: task.id,
    project_slug: task.project.slug,
    context: resolveTaskContext({
      workspace: task.project.workspace.context,
      project: task.project.context,
      taskHint: task.contextHint
    })
  };
}

export async function getTaskCommentsFromDb(taskId: string) {
  const comments = await db.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" }
  });

  return comments.map(mapComment);
}

export async function getTaskAttachmentsFromDb(taskId: string) {
  const attachments = await db.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      author: true
    }
  });

  return attachments.map(mapAttachment);
}

export async function getAttachmentDownloadFromDb(attachmentId: string) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      task: {
        include: {
          project: {
            include: {
              workspace: true
            }
          }
        }
      }
    }
  });

  if (!attachment) {
    return null;
  }

  try {
    const bytes = await readAttachmentFile(attachment.storagePath);

    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      bytes
    };
  } catch {
    return null;
  }
}

export async function getAttachmentPreviewFromDb(attachmentId: string) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      storagePath: true
    }
  });

  if (!attachment) {
    return null;
  }

  const previewKind = getAttachmentPreviewKind(attachment.mimeType);

  if (!previewKind) {
    return {
      error: "PREVIEW_UNSUPPORTED"
    } as const;
  }

  try {
    const bytes = await readAttachmentFile(attachment.storagePath);

    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      previewKind,
      bytes
    };
  } catch {
    return null;
  }
}

export async function getWorkspaceAssetDownloadFromDb(assetId: string) {
  const asset = await db.workspaceAsset.findUnique({
    where: { id: assetId }
  });

  if (!asset) {
    return null;
  }

  try {
    const bytes = await readWorkspaceAssetFile(asset.storagePath);
    return {
      id: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      bytes
    };
  } catch {
    return null;
  }
}

export async function getWorkspaceAssetPreviewFromDb(assetId: string) {
  const asset = await db.workspaceAsset.findUnique({
    where: { id: assetId }
  });

  if (!asset) {
    return null;
  }

  const previewKind = getAttachmentPreviewKind(asset.mimeType);

  if (!previewKind) {
    return {
      error: "PREVIEW_UNSUPPORTED"
    } as const;
  }

  try {
    const bytes = await readWorkspaceAssetFile(asset.storagePath);
    return {
      id: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      previewKind,
      bytes
    };
  } catch {
    return null;
  }
}

export async function getTaskActivityFromDb(taskId: string) {
  const activity = await db.taskActivity.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" }
  });

  return activity.map(mapActivity);
}

export async function getTaskExecutionFromDb(taskId: string) {
  const execution = await db.taskExecution.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      logs: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!execution) {
    return {
      status: null,
      logs: []
    };
  }

  return {
    status: execution.status,
    logs: execution.logs.map((log) => log.line)
  };
}

export async function searchWorkspaceForUi(query: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      query: "",
      projects: [],
      tasks: [],
      total: 0
    };
  }

  const projects = await db.project.findMany({
    where: {
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}),
      status: "active",
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { description: { contains: trimmed, mode: "insensitive" } }
      ]
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      tasks: true,
      memberships: true
    },
    take: 8
  });

  const tasks = await db.task.findMany({
    where: {
      project: activeWorkspace ? { workspaceId: activeWorkspace.id } : undefined,
      OR: [
        { id: { contains: trimmed, mode: "insensitive" } },
        { title: { contains: trimmed, mode: "insensitive" } },
        { description: { contains: trimmed, mode: "insensitive" } }
      ]
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      project: true,
      parentTask: {
        select: {
          id: true,
          title: true
        }
      },
      childTasks: {
        select: {
          id: true
        }
      },
      assignee: true,
      reviewer: true
    },
    take: 18
  });

  return {
    query: trimmed,
    projects: projects.map((project): ProjectSummary => ({
      slug: project.slug,
      name: project.name,
      description: project.description ?? "",
      status:
        project.tasks.some((task) => task.status === "blocked")
          ? "At risk"
          : project.tasks.some((task) => task.status === "review")
            ? "Needs review"
            : "On track",
      lifecycle: formatProjectLifecycle(project.status),
      visibility: formatProjectVisibility(project.visibility),
      contextSummary: mapContextBlock(project.context, "Project context").summary,
      due: formatShortDate(project.endDate ?? null),
      members: project.memberships.length,
      open: project.tasks.filter((task) => task.status !== "done").length,
      review: project.tasks.filter((task) => task.status === "review").length,
      blocked: project.tasks.filter((task) => task.status === "blocked").length,
      completed: project.tasks.filter((task) => task.status === "done").length,
      completionRate: `${project.tasks.length ? Math.round((project.tasks.filter((task) => task.status === "done").length / project.tasks.length) * 100) : 0}%`
    })),
    tasks: tasks.map(mapTaskRecord),
    total: projects.length + tasks.length
  };
}

export async function getWorkspaceContextBlockForUi() {
  const workspace = await getActiveWorkspaceRecord();

  return workspace ? mapContextBlock(workspace.context, "Workspace context") : null;
}

export async function getActivityFeedForUi(limit = 8) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const activity = await db.taskActivity.findMany({
    where: activeWorkspace
      ? {
          task: {
            project: {
              workspaceId: activeWorkspace.id
            }
          }
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return activity.map(
    (item): ActivityFeedItem => ({
      id: item.id,
      label: item.actorName ? `${item.actorName} · ${item.label}` : item.label,
      detail: item.detail,
      time: formatRelativeTime(item.createdAt)
    })
  );
}

export async function getDashboardMetricsForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const tasks = await db.task.findMany({
    where: activeWorkspace ? { project: { workspaceId: activeWorkspace.id } } : undefined,
    include: {
      assignee: true,
      executions: {
        include: {
          logs: true
        }
      }
    }
  });

  const dueSoon = tasks.filter((task) => {
    if (!task.dueDate || task.status === "done") {
      return false;
    }

    const diff = task.dueDate.getTime() - Date.now();
    return diff <= 2 * 86400000;
  }).length;
  const reviewCount = tasks.filter((task) => task.status === "review").length;
  const blockedCount = tasks.filter((task) => task.status === "blocked").length;
  const agentExecutionCount = tasks.reduce((count, task) => count + task.executions.length, 0);

  return [
    { label: "Due soon", value: String(dueSoon), detail: "Open work closing in", tone: "warning" },
    { label: "Agent throughput", value: String(agentExecutionCount), detail: "Tracked execution runs", tone: "accent" },
    { label: "In review", value: String(reviewCount), detail: "Tasks awaiting review", tone: "neutral" },
    { label: "Blocked", value: String(blockedCount), detail: "Tasks needing input", tone: "success" }
  ] as Metric[];
}

export async function getWorkspaceAssetsFromDb() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const assets = await db.workspaceAsset.findMany({
    where: { workspaceId: activeWorkspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          name: true
        }
      }
    }
  });

  return assets.map(mapWorkspaceAsset);
}

export async function getProjectWorkspaceForUi(slug: string) {
  const projects = await getProjectsForUi({ includeArchived: true });
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    return null;
  }

  const [workspaceContext, projectContext, tasks, board] = await Promise.all([
    getWorkspaceContextBlockForUi(),
    getProjectContextBlockForUi(slug),
    getTasksForUi({ projectSlug: slug }),
    getBoardColumnsForUi(slug)
  ]);

  const featuredTask = tasks[0] ? await getTaskWorkspaceForUi(tasks[0].id) : null;

  return {
    project,
    workspaceContext,
    projectContext,
    tasks,
    board,
    featuredTask
  };
}

export async function updateProjectGovernanceInDb(
  slug: string,
  payload: {
    visibility?: "workspace" | "project_members";
    status?: "active" | "archived";
  }
) {
  const project = await db.project.findFirst({
    where: { slug }
  });

  if (!project) {
    return null;
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: {
      visibility: payload.visibility ?? project.visibility,
      status: payload.status ?? project.status
    }
  });

  return {
    id: updated.id,
    slug: updated.slug,
    visibility: updated.visibility,
    status: updated.status
  };
}

export async function createCommentInDb(taskId: string, payload: {
  author: string;
  role: string;
  tone: "human" | "agent";
  body: string;
  membershipId?: string | null;
}) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      project: {
        select: {
          workspaceId: true
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  const defaultHumanMembership = await getDefaultHumanMembership(task.project.workspaceId);
  const membership = payload.membershipId
    ? await db.membership.findUnique({
        where: { id: payload.membershipId }
      })
    : await db.membership.findFirst({
        where: {
          workspaceId: task.project.workspaceId,
          name: payload.author
        }
      });
  const authorName = membership?.name ?? defaultHumanMembership?.name ?? payload.author;
  const authorRole = membership?.roleLabel ?? defaultHumanMembership?.roleLabel ?? payload.role;

  if (payload.tone === "agent" && membership?.kind === "agent" && !agentHasPermission(membership, "comment")) {
    await logPermissionDenied(taskId, membership.id, membership.name, `${membership.name} attempted to post a comment without comment permission.`);
    return {
      error: "AGENT_PERMISSION_DENIED"
    } as const;
  }

  const comment = await db.comment.create({
    data: {
      taskId,
      authorId: membership?.id,
      authorName: authorName,
      authorRole: authorRole,
      tone: payload.tone,
      body: payload.body
    }
  });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: membership?.id,
      actorName: authorName,
      label: "Comment added",
      detail: `${authorName} posted an update`
    }
  });

  return mapComment(comment);
}

export async function createAttachmentInDb(taskId: string, payload: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
  artifactType?: string;
  actorName?: string;
  actorType?: "human" | "agent";
  membershipId?: string | null;
}) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: true
    }
  });

  if (!task) {
    return null;
  }

  const defaultHumanMembership = await getDefaultHumanMembership(task.project.workspaceId);
  const membership = payload.membershipId
    ? await db.membership.findFirst({
        where: {
          id: payload.membershipId,
          workspaceId: task.project.workspaceId
        }
      })
    : await db.membership.findFirst({
        where: {
          workspaceId: task.project.workspaceId,
          name: payload.actorName?.trim() || defaultHumanMembership?.name || "Workspace Owner"
        }
      });
  const actorName = membership?.name ?? payload.actorName?.trim() ?? defaultHumanMembership?.name ?? "Workspace Owner";

  if (payload.actorType === "agent") {
    if (!membership || membership.kind !== "agent" || !membership.enabled) {
      return {
        error: "AGENT_UPLOAD_NOT_ALLOWED"
      } as const;
    }
  }

  const stored = await storeAttachmentFile(taskId, payload.originalName, payload.bytes);
  const attachment = await db.attachment.create({
    data: {
      taskId,
      authorId: membership?.id,
      originalName: payload.originalName,
      storagePath: stored.relativePath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      artifactType: payload.artifactType?.trim() || "reference"
    },
    include: {
      author: true
    }
  });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: membership?.id,
      actorName,
      label: "Attachment added",
      detail: `${actorName} uploaded ${payload.originalName}`
    }
  });

  return mapAttachment(attachment);
}

export async function createWorkspaceAssetInDb(payload: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
  assetType?: string;
}) {
  const workspace = await getActiveWorkspaceRecord();

  if (!workspace) {
    return null;
  }

  const author = await getDefaultHumanMembership(workspace.id);

  const stored = await storeWorkspaceAssetFile(workspace.slug, payload.originalName, payload.bytes);
  const asset = await db.workspaceAsset.create({
    data: {
      workspaceId: workspace.id,
      authorId: author?.id ?? null,
      originalName: payload.originalName,
      storagePath: stored.relativePath,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      assetType: payload.assetType ?? "reference"
    },
    include: {
      author: {
        select: {
          name: true
        }
      }
    }
  });

  return mapWorkspaceAsset(asset);
}

export async function createAgentCredentialInDb(payload: {
  membershipId: string;
  name: string;
  scopes: AgentScope[];
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const membership = await db.membership.findFirst({
    where: {
      id: payload.membershipId,
      workspaceId: activeWorkspace.id,
      kind: "agent"
    }
  });

  if (!membership) {
    return {
      error: "AGENT_NOT_FOUND"
    } as const;
  }

  const token = await createAgentAccessToken();
  const tokenHash = await hashAgentAccessToken(token);

  const credential = await db.agentCredential.create({
    data: {
      membershipId: membership.id,
      name: payload.name.trim(),
      tokenHash,
      scopes: Array.from(new Set(payload.scopes))
    },
    include: {
      membership: {
        select: {
          name: true
        }
      }
    }
  });

  await db.authEvent.create({
    data: {
      workspaceId: activeWorkspace.id,
      membershipId: membership.id,
      actorType: "owner",
      actorLabel: getOwnerAuthConfig().email,
      eventType: "agent.credential_created",
      detail: `Created credential ${credential.name} for ${membership.name}`
    }
  });

  return {
    credential: mapAgentCredential(credential),
    token
  };
}

export async function updateAgentCredentialInDb(credentialId: string, enabled: boolean) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const credential = await db.agentCredential.findFirst({
    where: {
      id: credentialId,
      membership: {
        workspaceId: activeWorkspace.id
      }
    },
    include: {
      membership: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!credential) {
    return null;
  }

  const updated = await db.agentCredential.update({
    where: { id: credentialId },
    data: { enabled },
    include: {
      membership: {
        select: {
          name: true
        }
      }
    }
  });

  await db.authEvent.create({
    data: {
      workspaceId: activeWorkspace.id,
      membershipId: credential.membership.id,
      actorType: "owner",
      actorLabel: getOwnerAuthConfig().email,
      eventType: enabled ? "agent.credential_enabled" : "agent.credential_revoked",
      detail: `${enabled ? "Enabled" : "Revoked"} credential ${updated.name} for ${credential.membership.name}`
    }
  });

  return mapAgentCredential(updated);
}


export async function updateCommentInDb(taskId: string, commentId: string, body: string) {
  const existing = await db.comment.findFirst({
    where: {
      id: commentId,
      taskId
    }
  });

  if (!existing) {
    return null;
  }

  if (existing.tone !== "human") {
    return {
      error: "ONLY_HUMAN_COMMENTS_EDITABLE"
    } as const;
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { body }
  });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: existing.authorId,
      actorName: existing.authorName,
      label: "Comment edited",
      detail: `${existing.authorName} edited a comment`
    }
  });

  return mapComment(updated);
}

export async function appendExecutionLogInDb(taskId: string, line: string, actor?: { membershipId?: string | null; label?: string | null }) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      project: {
        include: {
          workspace: {
            include: {
              memberships: {
                where: { kind: "agent", enabled: true },
                orderBy: { createdAt: "asc" }
              }
            }
          }
        }
      },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!task) {
    return null;
  }

  const explicitAgent =
    actor?.membershipId
      ? await db.membership.findFirst({
          where: {
            id: actor.membershipId,
            workspaceId: task.project.workspaceId,
            kind: "agent"
          }
        })
      : null;

  const agentId =
    explicitAgent?.id ??
    (task.assignee?.kind === "agent" ? task.assignee.id : null) ??
    task.project.workspace.memberships[0]?.id;

  if (!agentId) {
    return null;
  }

  const agent = explicitAgent ?? (task.assignee?.kind === "agent" ? task.assignee : task.project.workspace.memberships[0] ?? null);

  if (!agent || !agentHasPermission(agent, "log_execution")) {
    if (agent) {
      await logPermissionDenied(taskId, agent.id, agent.name, `${agent.name} attempted to write execution logs without log_execution permission.`);
    }
    return {
      error: "AGENT_PERMISSION_DENIED"
    } as const;
  }

  const execution =
    task.executions[0] ??
    (await db.taskExecution.create({
      data: {
        taskId,
        agentId: agent.id,
        status: "running"
      }
    }));

  const log = await db.taskExecutionLog.create({
    data: {
      executionId: execution.id,
      line
    }
  });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: agentId,
      actorName: agent.name,
      label: "Execution updated",
      detail: line
    }
  });

  return {
    taskId,
    line: log.line,
    time: log.createdAt.toISOString()
  };
}

export async function setTaskWatchersInDb(taskId: string, membershipIds: string[]) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          memberships: {
            include: {
              membership: true
            }
          }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  const allowedIds = new Set(
    task.project.memberships
      .map((item) => item.membership)
      .filter((member) => member.enabled)
      .map((member) => member.id)
  );
  const nextIds = Array.from(new Set(membershipIds.filter((id) => allowedIds.has(id))));

  await db.taskWatcher.deleteMany({
    where: { taskId }
  });

  if (nextIds.length) {
    await db.taskWatcher.createMany({
      data: nextIds.map((membershipId) => ({
        taskId,
        membershipId
      }))
    });
  }

  return {
    taskId,
    watchers: task.project.memberships
      .map((item) => item.membership)
      .filter((member) => nextIds.includes(member.id))
      .map(mapWatcher)
  };
}
