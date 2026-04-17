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
import type { ActivityFeedItem, AttachmentRecord, Member, Metric, ProjectSummary, TaskRecord, WatcherRecord } from "@/lib/demo-data";
import { mapContextBlock } from "@/lib/context-block";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";
import { getRequestI18n } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/messages/en";
import type { Translator } from "@/lib/i18n/translator";
import {
  formatLocalizedWorkspaceRole,
  localizeLooseRoleLabel,
  localizeMemberRoleLabel,
  localizeSystemMemberName
} from "@/lib/member-display";
export { syncActiveWorkspaceConstructorAgentsInDb } from "@/lib/server/constructor-server";
export {
  getMembersForUi,
  updateAgentPermissionsInDb,
  updateMemberEnabledInDb,
  updateWorkspaceRoleInDb
} from "@/lib/server/members-server";
export {
  createWorkspaceInDb,
  deleteWorkspaceInDb,
  getActiveWorkspaceConstructorIntegration,
  getActiveWorkspaceConstructorIntegrationRecord,
  getWorkspaceManagementDataForUi,
  getWorkspaceShellDataForUi,
  moveProjectToWorkspaceInDb,
  updateActiveWorkspaceInDb,
  upsertActiveWorkspaceConstructorIntegrationInDb
} from "@/lib/server/workspace-server";
import {
  createProjectInDb,
  deleteProjectInDb,
  getProjectContextBlockForUi,
  getProjectEditDataForUi,
  getProjectMembersForUi,
  getProjectsForUi,
  setProjectMembersInDb,
  updateProjectInDb
} from "@/lib/server/projects-server";
export {
  createProjectInDb,
  deleteProjectInDb,
  getProjectContextBlockForUi,
  getProjectEditDataForUi,
  getProjectMembersForUi,
  getProjectsForUi,
  setProjectMembersInDb,
  updateProjectInDb
};
import {
  createTaskInDb,
  deleteTaskInDb,
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
  deleteTaskInDb,
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

function formatWorkspaceRole(role: string, t: Translator): NonNullable<Member["workspaceRole"]> {
  return formatLocalizedWorkspaceRole(role, t) as NonNullable<Member["workspaceRole"]>;
}

function formatProjectRole(role: string, t: Translator) {
  switch (role) {
    case "lead":
      return t("membersServer.lead");
    case "observer":
      return t("membersServer.observer");
    default:
      return t("membersServer.member");
  }
}

function formatProjectVisibility(visibility: string, t: Translator): NonNullable<ProjectSummary["visibility"]> {
  return (visibility === "project_members" ? t("projectsServer.projectMembersVisibility") : t("projectsServer.workspaceVisibility")) as NonNullable<ProjectSummary["visibility"]>;
}

function formatProjectLifecycle(status: string, t: Translator): NonNullable<ProjectSummary["lifecycle"]> {
  return (status === "archived" ? t("projectsServer.archived") : t("projectsServer.active")) as NonNullable<ProjectSummary["lifecycle"]>;
}

function formatShortDate(date: Date | null | undefined, t: Translator) {
  if (!date) {
    return t("taskServer.noDate");
  }

  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfDate.getTime() - startOfNow.getTime()) / 86400000);

  if (dayDiff === 0) {
    return t("taskServer.today");
  }

  if (dayDiff === 1) {
    return t("taskServer.tomorrow");
  }

  if (dayDiff === -1) {
    return t("taskServer.yesterday");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatRelativeTime(date: Date, t: Translator) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes <= 1) {
    return t("taskServer.justNow");
  }

  if (diffMinutes < 60) {
    return t("taskServer.minutesAgo", { count: diffMinutes });
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return t("taskServer.hoursAgo", { count: diffHours });
  }

  const diffDays = Math.round(diffHours / 24);
  return t("taskServer.daysAgo", { count: diffDays });
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

const HUMAN_STATUS_TRANSITIONS: Record<string, Array<{ value: "todo" | "in_progress" | "review" | "blocked" | "done"; labelKey: keyof Messages["taskServer"]["transitionActions"] }>> = {
  todo: [
    { value: "in_progress", labelKey: "startWork" },
    { value: "blocked", labelKey: "markBlocked" },
    { value: "done", labelKey: "markDone" }
  ],
  in_progress: [
    { value: "review", labelKey: "moveToReview" },
    { value: "blocked", labelKey: "markBlocked" },
    { value: "done", labelKey: "markDone" },
    { value: "todo", labelKey: "moveBackToTodo" }
  ],
  review: [
    { value: "in_progress", labelKey: "resumeWork" },
    { value: "blocked", labelKey: "markBlocked" },
    { value: "done", labelKey: "approveDone" }
  ],
  blocked: [
    { value: "todo", labelKey: "moveToTodo" },
    { value: "in_progress", labelKey: "resumeWork" },
    { value: "done", labelKey: "closeAsDone" }
  ],
  done: [{ value: "in_progress", labelKey: "reopenTask" }]
};

const AGENT_STATUS_TRANSITIONS: Record<string, Array<{ value: "todo" | "in_progress" | "review" | "blocked" | "done"; labelKey: keyof Messages["taskServer"]["transitionActions"] }>> = {
  todo: [{ value: "in_progress", labelKey: "startExecution" }],
  in_progress: [
    { value: "review", labelKey: "moveToReview" },
    { value: "done", labelKey: "markDone" },
    { value: "blocked", labelKey: "markBlocked" }
  ],
  review: [
    { value: "in_progress", labelKey: "resumeWork" },
    { value: "done", labelKey: "approveDone" },
    { value: "blocked", labelKey: "markBlocked" }
  ],
  blocked: [{ value: "in_progress", labelKey: "resumeWork" }],
  done: []
};

function mapTransitionOptions(options: Array<{ value: "todo" | "in_progress" | "review" | "blocked" | "done"; labelKey: keyof Messages["taskServer"]["transitionActions"] }>, t: Translator) {
  return options.map((option) => ({
    value: option.value,
    label: t(`taskServer.transitionActions.${option.labelKey}`)
  }));
}

function getAgentTransitionOptions(status: string, t: Translator) {
  return mapTransitionOptions(AGENT_STATUS_TRANSITIONS[status] ?? [], t);
}

function getHumanTransitionOptions(status: string, t: Translator) {
  return mapTransitionOptions(HUMAN_STATUS_TRANSITIONS[status] ?? [], t);
}

function isAllowedAgentTransition(from: string, to: string) {
  return (AGENT_STATUS_TRANSITIONS[from] ?? []).some((option) => option.value === to);
}

function isAllowedHumanTransition(from: string, to: string) {
  return (HUMAN_STATUS_TRANSITIONS[from] ?? []).some((option) => option.value === to);
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
}, t: Translator): WatcherRecord {
  return {
    id: membership.id,
    name: membership.name,
    type: (membership.kind === "agent" ? t("membersServer.agent") : t("membersServer.human")) as WatcherRecord["type"]
  };
}

async function logPermissionDenied(taskId: string, actorId: string | null, actorName: string, detail: string) {
  const { t } = await getRequestI18n();
  await db.taskActivity.create({
    data: {
      taskId,
      actorId: actorId ?? undefined,
      actorName,
      label: t("taskServer.permissionDenied"),
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
  assignee: { name: string; kind: string; sourceSystem: string | null; capabilities: string[]; enabled: boolean; agentPermissions: string[] } | null;
  reviewer?: { name: string } | null;
}, t: Translator): TaskRecord {
  return {
    id: task.id,
    title: task.title,
    projectSlug: task.project.slug,
    project: task.project.name,
    description: task.description ?? "",
    status: formatStatus(task.status),
    priority: formatPriority(task.priority),
    assignee: localizeSystemMemberName(task.assignee?.name, t) ?? t("taskServer.unassigned"),
    assigneeType: (task.assignee?.kind === "agent" ? t("membersServer.agent") : t("membersServer.human")) as TaskRecord["assigneeType"],
    assigneeSourceSystem: task.assignee?.sourceSystem ?? null,
    reviewer: localizeSystemMemberName(task.reviewer?.name, t) ?? undefined,
    due: formatShortDate(task.dueDate, t),
    startDate: formatShortDate(task.startDate, t),
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
    humanTransitionOptions: getHumanTransitionOptions(task.status, t),
    transitionOptions: task.assignee?.kind === "agent" ? getAgentTransitionOptions(task.status, t) : undefined
  };
}

function getTaskStatusKey(status: TaskRecord["status"] | string) {
  switch (status) {
    case "In Progress":
      return "inProgress";
    case "In Review":
      return "inReview";
    case "Blocked":
      return "blocked";
    case "Done":
      return "done";
    default:
      return "todo";
  }
}

function buildBoardColumns(items: TaskRecord[]) {
  const config: Array<{
    title: string;
    statusKey: "todo" | "inProgress" | "inReview" | "blocked" | "done";
    accent: "slate" | "blue" | "gold" | "red" | "emerald";
  }> = [
    { title: "todo", statusKey: "todo", accent: "slate" },
    { title: "in-progress", statusKey: "inProgress", accent: "blue" },
    { title: "in-review", statusKey: "inReview", accent: "gold" },
    { title: "blocked", statusKey: "blocked", accent: "red" },
    { title: "done", statusKey: "done", accent: "emerald" }
  ];

  return config.map((column) => ({
    title: column.title,
    statusKey: column.statusKey,
    count: items.filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === column.statusKey).length,
    accent: column.accent,
    cards: items
      .filter((task) => getTaskStatusKey(task.rawStatus ?? task.status) === column.statusKey)
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
}, t: Translator) {
  return {
    id: member.id,
    name: localizeSystemMemberName(member.name, t) ?? member.name,
    type: (member.kind === "agent" ? t("membersServer.agent") : t("membersServer.human")) as "Agent" | "Human",
    role: localizeMemberRoleLabel(member, t),
    workspaceRole: formatWorkspaceRole(member.workspaceRole, t),
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
}, t: Translator) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: localizeSystemMemberName(comment.authorName, t) ?? comment.authorName,
    role: localizeLooseRoleLabel(comment.authorRole, t),
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
}, t: Translator): AttachmentRecord {
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
    uploadedAt: formatRelativeTime(attachment.createdAt, t),
    author: localizeSystemMemberName(attachment.author?.name, t) ?? undefined
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
}, t: Translator): AttachmentRecord {
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
    uploadedAt: formatRelativeTime(asset.createdAt, t),
    author: localizeSystemMemberName(asset.author?.name, t) ?? undefined
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
}, t: Translator) {
  return {
    id: credential.id,
    name: credential.name,
    scopes: credential.scopes,
    enabled: credential.enabled,
    agentName: localizeSystemMemberName(credential.membership.name, t) ?? credential.membership.name,
    lastUsedAt: credential.lastUsedAt ? formatRelativeTime(credential.lastUsedAt, t) : t("taskServer.never"),
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

function mapActivity(item: {
  id: string;
  taskId: string;
  actorName: string | null;
  label: string;
  detail: string;
  createdAt: Date;
}, t: Translator) {
  return {
    id: item.id,
    taskId: item.taskId,
    actor: localizeSystemMemberName(item.actorName, t) ?? item.actorName,
    label: item.label,
    detail: item.detail,
    time: item.createdAt.toISOString()
  };
}

export async function getWorkspaceContextFromDb() {
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

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
      members: workspace.memberships.map((member) => mapMembership(member, t))
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
  const { t } = await getRequestI18n();
  const comments = await db.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" }
  });

  return comments.map((comment) => mapComment(comment, t));
}

export async function getTaskAttachmentsFromDb(taskId: string) {
  const { t } = await getRequestI18n();
  const attachments = await db.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: {
      author: true
    }
  });

  return attachments.map((attachment) => mapAttachment(attachment, t));
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
  const { t } = await getRequestI18n();
  const activity = await db.taskActivity.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" }
  });

  return activity.map((item) => mapActivity(item, t));
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
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);
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
          ? "at_risk"
          : project.tasks.some((task) => task.status === "review")
            ? "needs_review"
            : "on_track",
      rawLifecycle: project.status,
      rawVisibility: project.visibility,
      lifecycle: formatProjectLifecycle(project.status, t),
      visibility: formatProjectVisibility(project.visibility, t),
      contextSummary: mapContextBlock(project.context, "Project context").summary,
      due: formatShortDate(project.endDate ?? null, t),
      members: project.memberships.length,
      open: project.tasks.filter((task) => task.status !== "done").length,
      review: project.tasks.filter((task) => task.status === "review").length,
      blocked: project.tasks.filter((task) => task.status === "blocked").length,
      completed: project.tasks.filter((task) => task.status === "done").length,
      completionRate: `${project.tasks.length ? Math.round((project.tasks.filter((task) => task.status === "done").length / project.tasks.length) * 100) : 0}%`
    })),
    tasks: tasks.map((task) => mapTaskRecord(task, t)),
    total: projects.length + tasks.length
  };
}

export async function getWorkspaceContextBlockForUi() {
  const [workspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

  return workspace ? mapContextBlock(workspace.context, "Workspace context") : null;
}

export async function getActivityFeedForUi(limit = 8) {
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);
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
      time: formatRelativeTime(item.createdAt, t)
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
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

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

  return assets.map((asset) => mapWorkspaceAsset(asset, t));
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
  const { t } = await getRequestI18n();
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
    : payload.tone === "human"
      ? await db.membership.findFirst({
          where: {
            workspaceId: task.project.workspaceId,
            name: payload.author
          }
        })
      : null;
  const authorName = membership?.name ?? (payload.membershipId ? defaultHumanMembership?.name : null) ?? payload.author;
  const authorRole = membership?.roleLabel ?? (payload.membershipId ? defaultHumanMembership?.roleLabel : null) ?? payload.role;

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
      label: t("taskServer.commentAdded"),
      detail:
        payload.tone === "agent"
          ? t("taskServer.agentCommentDetail", { author: authorName })
          : t("taskServer.userCommentDetail", { author: authorName })
    }
  });

  return mapComment(comment, t);
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
  const { t } = await getRequestI18n();
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
          name: payload.actorName?.trim() || defaultHumanMembership?.name || t("taskServer.workspaceOwner")
        }
      });
  const actorName = membership?.name ?? payload.actorName?.trim() ?? defaultHumanMembership?.name ?? t("taskServer.workspaceOwner");

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
      label: t("taskServer.attachmentAdded"),
      detail: t("taskServer.attachmentUploadDetail", { author: actorName, fileName: payload.originalName })
    }
  });

  return mapAttachment(attachment, t);
}

export async function createWorkspaceAssetInDb(payload: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
  assetType?: string;
}) {
  const [workspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

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

  return mapWorkspaceAsset(asset, t);
}

export async function createAgentCredentialInDb(payload: {
  membershipId: string;
  name: string;
  scopes: AgentScope[];
}) {
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

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
    credential: mapAgentCredential(credential, t),
    token
  };
}

export async function updateAgentCredentialInDb(credentialId: string, enabled: boolean) {
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

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
      detail: `${enabled ? t("taskServer.credentialEnabled") : t("taskServer.credentialRevoked")} ${updated.name} ${t("taskServer.credentialFor")} ${credential.membership.name}`
    }
  });

  return mapAgentCredential(updated, t);
}


export async function updateCommentInDb(taskId: string, commentId: string, body: string) {
  const { t } = await getRequestI18n();
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
      label: t("taskServer.commentEdited"),
      detail: t("taskServer.userCommentEditedDetail", { authorName: existing.authorName })
    }
  });

  return mapComment(updated, t);
}

function classifyExecutionLine(line: string, t: Translator) {
  const trimmed = line.trim();

  if (trimmed.startsWith("CONSTRUCTOR_DISPATCH_ACCEPTED")) {
    return { label: t("taskServer.execution.constructorDispatchAccepted"), detail: trimmed };
  }

  if (trimmed.startsWith("CONSTRUCTOR_DISPATCH_FAILED")) {
    return { label: t("taskServer.execution.constructorDispatchFailed"), detail: trimmed };
  }

  if (trimmed.startsWith("CONSTRUCTOR_STATUS")) {
    return { label: t("taskServer.execution.constructorStatusUpdated"), detail: trimmed };
  }

  if (trimmed.startsWith("CONSTRUCTOR_CALLBACK_RECEIVED")) {
    return { label: t("taskServer.execution.constructorCallbackReceived"), detail: trimmed };
  }

  if (trimmed.startsWith("CONSTRUCTOR_CALLBACK_DUPLICATE_IGNORED")) {
    return { label: t("taskServer.execution.constructorCallbackDuplicateIgnored"), detail: trimmed };
  }

  if (trimmed.startsWith("TASK_DISPATCHED")) {
    return { label: t("taskServer.execution.taskDispatched"), detail: trimmed };
  }

  if (trimmed.startsWith("AGENT_ACCEPTED_TASK")) {
    return { label: t("taskServer.execution.agentAcceptedTask"), detail: trimmed };
  }

  if (trimmed.startsWith("AGENT_CONTEXT_RETRIEVED")) {
    return { label: t("taskServer.execution.agentRetrievedContext"), detail: trimmed };
  }

  if (trimmed.startsWith("AGENT_FINISHED_TASK")) {
    return { label: t("taskServer.execution.agentFinishedTask"), detail: trimmed };
  }

  if (trimmed.startsWith("AGENT_BLOCKED")) {
    return { label: t("taskServer.execution.agentBlocked"), detail: trimmed };
  }

  return { label: t("taskServer.execution.updated"), detail: trimmed };
}

type ExecutionLogActor = { membershipId?: string | null; label?: string | null };

export async function appendExecutionLogInDb(taskId: string, line: string, actor?: ExecutionLogActor) {
  const { t } = await getRequestI18n();
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

  const isSystemLogWrite = !actor?.membershipId && Boolean(actor?.label);
  const fallbackAgent = task.assignee?.kind === "agent" ? task.assignee : task.project.workspace.memberships[0] ?? null;
  const agent = explicitAgent ?? fallbackAgent;
  const executionMember =
    agent ??
    (isSystemLogWrite
      ? await db.membership.findFirst({
          where: {
            workspaceId: task.project.workspaceId,
            enabled: true
          },
          orderBy: { createdAt: "asc" }
        })
      : null);

  if (!agent && !isSystemLogWrite) {
    return null;
  }

  if (agent && !agentHasPermission(agent, "log_execution") && !isSystemLogWrite) {
    await logPermissionDenied(taskId, agent.id, agent.name, `${agent.name} attempted to write execution logs without log_execution permission.`);
    return {
      error: "AGENT_PERMISSION_DENIED"
    } as const;
  }

  const execution =
    task.executions[0] ??
    (await db.taskExecution.create({
      data: {
        taskId,
        agentId: executionMember?.id ?? agent?.id,
        status: "running"
      }
    }));

  const log = await db.taskExecutionLog.create({
    data: {
      executionId: execution.id,
      line
    }
  });

  const event = classifyExecutionLine(line, t);
  const actorId = isSystemLogWrite ? null : (agent?.id ?? null);
  const actorName = actor?.label?.trim() || agent?.name || t("taskServer.systemActor");

  await db.taskActivity.create({
    data: {
      taskId,
      actorId,
      actorName,
      label: event.label,
      detail: event.detail
    }
  });

  return {
    taskId,
    line: log.line,
    time: log.createdAt.toISOString()
  };
}

export async function appendSystemExecutionLogInDb(taskId: string, line: string, label: string) {
  return appendExecutionLogInDb(taskId, line, { label });
}

export async function deleteCommentInDb(taskId: string, commentId: string) {
  const { t } = await getRequestI18n();
  const comment = await db.comment.findFirst({
    where: { id: commentId, taskId }
  });
  if (!comment) return null;
  if (comment.tone === "agent") return { error: "AGENT_COMMENT_NOT_DELETABLE" } as const;
  await db.comment.delete({ where: { id: commentId } });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: comment.authorId,
      actorName: comment.authorName,
      label: t("taskServer.commentDeleted"),
      detail: t("taskServer.userCommentDeletedDetail", { authorName: comment.authorName })
    }
  });

  return { commentId };
}

export async function setTaskWatchersInDb(taskId: string, membershipIds: string[]) {
  const { t } = await getRequestI18n();
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
      .map((watcher) => mapWatcher(watcher, t))
  };
}
