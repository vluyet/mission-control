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
import type {
  ActivityFeedItem,
  AttachmentRecord,
  ContextBlock,
  Member,
  Metric,
  ProjectSummary,
  ShellCounts,
  TaskRecord,
  TimelineEvent,
  WatcherRecord,
  WorkspaceOption,
  WorkspaceSummary
} from "@/lib/demo-data";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";
import { dispatchOpenClawTaskRun, fetchOpenClawAgents } from "@/lib/openclaw";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function taskPrefixForProject(slug: string) {
  const parts = slug.split("-").filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "TS";
}

async function generateTaskId(projectSlug: string) {
  const prefix = taskPrefixForProject(projectSlug);
  const existing = await db.task.findMany({
    where: {
      id: {
        startsWith: `${prefix}-`
      }
    },
    select: {
      id: true
    }
  });

  let next = existing.length + 1;
  let candidate = `${prefix}-${String(next).padStart(3, "0")}`;

  while (existing.some((task) => task.id === candidate)) {
    next += 1;
    candidate = `${prefix}-${String(next).padStart(3, "0")}`;
  }

  return candidate;
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

function mapWorkspaceOption(workspace: {
  slug: string;
  name: string;
  visibility: string;
  memberships: { id: string }[];
  projects: { id: string }[];
}): WorkspaceOption {
  return {
    slug: workspace.slug,
    name: workspace.name,
    plan: workspace.visibility === "shared" ? "Shared workspace" : "Owner workspace",
    progress: workspace.projects.length ? `${workspace.projects.length} active projects` : "No active projects",
    memberCount: workspace.memberships.length,
    projectCount: workspace.projects.length
  };
}

function mapWorkspaceSummary(workspace: {
  slug: string;
  name: string;
  visibility: string;
  memberships: { id: string }[];
  projects: { id: string }[];
}): WorkspaceSummary {
  return {
    slug: workspace.slug,
    name: workspace.name,
    plan: workspace.visibility === "shared" ? "Shared workspace" : "Owner workspace",
    progress: workspace.projects.length ? `${workspace.projects.length} active projects` : "No active projects"
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

export async function getTaskResourceFromDb(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          workspace: true
        }
      },
      assignee: true,
      reviewer: true,
      parentTask: {
        select: {
          id: true,
          title: true
        }
      },
      childTasks: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      watchers: {
        orderBy: { createdAt: "asc" },
        include: {
          membership: true
        }
      },
      comments: {
        orderBy: { createdAt: "asc" }
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: {
          author: true
        }
      },
      activity: {
        orderBy: { createdAt: "asc" }
      },
      executions: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: true,
          logs: {
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  const latestExecution = task.executions[0] ?? null;
  const resolvedContext = resolveTaskContext({
    workspace: task.project.workspace.context,
    project: task.project.context,
    taskHint: task.contextHint
  });

  return {
    task: {
      id: task.id,
      title: task.title,
      projectSlug: task.project.slug,
      project: task.project.name,
      description: task.description,
      status:
        task.status === "in_progress"
          ? "In Progress"
          : task.status === "review"
            ? "In Review"
            : task.status === "done"
              ? "Done"
              : task.status === "blocked"
                ? "Blocked"
                : "Todo",
      priority: task.priority.charAt(0).toUpperCase() + task.priority.slice(1),
      assignee: task.assignee?.name ?? "Unassigned",
      assigneeType: task.assignee?.kind === "agent" ? "Agent" : "Human",
      assigneeCapabilities: task.assignee?.kind === "agent" ? task.assignee.capabilities : [],
      assigneeEnabled: task.assignee?.enabled ?? true,
      assigneePermissions: task.assignee?.kind === "agent" ? task.assignee.agentPermissions : [],
      humanTransitionOptions: getHumanTransitionOptions(task.status),
      transitionOptions: task.assignee?.kind === "agent" ? getAgentTransitionOptions(task.status) : [],
      reviewer: task.reviewer?.name ?? null,
      due: task.dueDate?.toISOString() ?? null,
      startDate: task.startDate?.toISOString() ?? null,
      tags: task.tags,
      parentTaskId: task.parentTask?.id ?? null,
      parentTaskTitle: task.parentTask?.title ?? null,
      childCount: task.childTasks.length,
      effort: task.effort,
      blockedReason: task.blockedReason,
      contextHint: task.contextHint
    },
    watchers: task.watchers.map((watcher) => mapWatcher(watcher.membership)),
    available_watchers: task.project
      ? await db.projectMembership.findMany({
          where: { projectId: task.projectId },
          include: { membership: true },
          orderBy: { createdAt: "asc" }
        }).then((items) =>
          items
            .map((item) => item.membership)
            .filter((member) => member.enabled)
            .map(mapWatcher)
        )
      : [],
    resolved_context: resolvedContext,
    comments: task.comments.map(mapComment),
    attachments: task.attachments.map(mapAttachment),
    child_tasks: task.childTasks.map((child) => ({
      id: child.id,
      title: child.title,
      status: formatStatus(child.status)
    })),
    activity: task.activity.map(mapActivity),
    execution: {
      latest_status: latestExecution?.status ?? null,
      logs: latestExecution?.logs.map((log) => log.line) ?? []
    }
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

export async function getProjectsForUi(options?: {
  includeArchived?: boolean;
  visibilityMembershipId?: string | null;
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const projects = await db.project.findMany({
    where: {
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}),
      ...(!options?.includeArchived ? { status: "active" } : {}),
      ...buildProjectVisibilityWhere(options?.visibilityMembershipId)
    },
    orderBy: { createdAt: "asc" },
    include: {
      tasks: true,
      memberships: true
    }
  });

  return projects.map((project): ProjectSummary => {
    const memberIds = new Set(
      project.tasks.flatMap((task) => [task.assigneeId, task.reviewerId].filter((value): value is string => Boolean(value)))
    );

    return {
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
      members: project.memberships.length || memberIds.size,
      open: project.tasks.filter((task) => task.status !== "done").length,
      review: project.tasks.filter((task) => task.status === "review").length,
      blocked: project.tasks.filter((task) => task.status === "blocked").length,
      completed: project.tasks.filter((task) => task.status === "done").length,
      completionRate: `${project.tasks.length ? Math.round((project.tasks.filter((task) => task.status === "done").length / project.tasks.length) * 100) : 0}%`
    };
  });
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

export async function getProjectContextBlockForUi(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: {
      slug,
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {})
    }
  });

  return project ? mapContextBlock(project.context, "Project context") : null;
}

export async function getProjectMembersForUi(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: {
      slug,
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {})
    },
    include: {
      workspace: {
        include: {
          memberships: {
            where: { enabled: true },
            orderBy: { createdAt: "asc" }
          }
        }
      },
      memberships: {
        include: {
          membership: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!project) {
    return null;
  }

  const selectedIds = new Set(project.memberships.map((item) => item.membershipId));

  return {
    project: {
      slug: project.slug,
      name: project.name,
      status: project.status,
      visibility: project.visibility
    },
    selectedMemberIds: Array.from(selectedIds),
    selectedRoles: Object.fromEntries(project.memberships.map((item) => [item.membershipId, item.role])),
    members: project.workspace.memberships.map((member) => ({
      id: member.id,
      name: member.name,
      type: (member.kind === "agent" ? "Agent" : "Human") as "Agent" | "Human",
      role: member.roleLabel ?? (member.kind === "agent" ? "Agent" : "Member"),
      workspaceRole: formatWorkspaceRole(member.workspaceRole),
      projectRole: formatProjectRole(project.memberships.find((item) => item.membershipId === member.id)?.role ?? "member")
    }))
  };
}

export async function getTasksForUi(filters?: {
  projectSlug?: string;
  assigneeName?: string;
  agentOnly?: boolean;
  status?: "todo" | "in_progress" | "review" | "blocked" | "done";
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const tasks = await db.task.findMany({
    where: {
      project: {
        ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}),
        ...(filters?.projectSlug ? { slug: filters.projectSlug } : {})
      },
      ...(filters?.assigneeName ? { assignee: { name: filters.assigneeName } } : {}),
      ...(filters?.agentOnly ? { assignee: { kind: "agent" } } : {}),
      ...(filters?.status ? { status: filters.status } : {})
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
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
    }
  });

  return tasks.map(mapTaskRecord);
}

export async function getMyTasksForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const ownerMembership = activeWorkspace ? await getDefaultHumanMembership(activeWorkspace.id) : null;
  const tasks = await db.task.findMany({
    where: {
      ...(activeWorkspace ? { project: { workspaceId: activeWorkspace.id } } : {}),
      OR: ownerMembership
        ? [{ assigneeId: ownerMembership.id }, { assignee: { kind: "agent" } }]
        : [{ assignee: { kind: "agent" } }]
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
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
    }
  });

  return tasks.map(mapTaskRecord);
}

export async function getMembersForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const memberships = await db.membership.findMany({
    where: {
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {})
    },
    orderBy: { createdAt: "asc" },
    include: {
      tasks: {
        include: {
          project: true
        }
      }
    }
  });

  return memberships.map(
    (member): Member => ({
      id: member.id,
      name: member.name,
      type: member.kind === "agent" ? "Agent" : "Human",
      role: member.roleLabel ?? (member.kind === "agent" ? "Agent" : "Member"),
      workspaceRole: formatWorkspaceRole(member.workspaceRole),
      email: member.email ?? undefined,
      avatarUrl: member.avatarUrl ?? undefined,
      capabilities: member.capabilities,
      agentPermissions: member.kind === "agent" ? member.agentPermissions : [],
      active: member.enabled,
      load: member.enabled ? `${member.tasks.length} active tasks` : "Disabled",
      projects: Array.from(new Set(member.tasks.map((task) => task.project.name))),
      taskCount: member.tasks.length
    })
  );
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

export async function getBoardColumnsForUi(projectSlug?: string) {
  const items = await getTasksForUi(projectSlug ? { projectSlug } : undefined);
  return buildBoardColumns(items);
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
    db.project.count({
      where: {
        workspaceId: currentWorkspace.id,
        status: "active"
      }
    }),
    db.membership.count({
      where: {
        workspaceId: currentWorkspace.id,
        enabled: true
      }
    }),
    db.task.count({
      where: {
        project: {
          workspaceId: currentWorkspace.id
        },
        status: {
          not: "done"
        },
        assignee: {
          is: {
            kind: "human",
            enabled: true
          }
        }
      }
    }),
    db.task.count({
      where: {
        project: {
          workspaceId: currentWorkspace.id
        },
        status: {
          in: ["todo", "in_progress", "review", "blocked"]
        },
        assignee: {
          is: {
            kind: "agent",
            enabled: true
          }
        }
      }
    }),
    db.task.findFirst({
      where: {
        project: {
          workspaceId: currentWorkspace.id
        },
        status: {
          not: "done"
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        project: {
          select: {
            slug: true
          }
        }
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

  const [workspace, openclawIntegration, taskAttachmentsCount, workspaceAssetsCount, humanCount, agentCount, credentials, authEvents] = await Promise.all([
    db.workspace.findFirst({
      where: { id: activeWorkspace.id },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" }
        },
        projects: {
          where: { status: "active" },
          orderBy: { createdAt: "asc" }
        },
        assets: {
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }),
    db.workspaceOpenClawIntegration.findUnique({
      where: { workspaceId: activeWorkspace.id }
    }),
    db.attachment.count({
      where: {
        task: {
          project: {
            workspaceId: activeWorkspace.id
          }
        }
      }
    }),
    db.workspaceAsset.count({
      where: {
        workspaceId: activeWorkspace.id
      }
    }),
    db.membership.count({
      where: {
        workspaceId: activeWorkspace.id,
        enabled: true,
        kind: "human"
      }
    }),
    db.membership.count({
      where: {
        workspaceId: activeWorkspace.id,
        enabled: true,
        kind: "agent"
      }
    }),
    db.agentCredential.findMany({
      where: {
        membership: {
          workspaceId: activeWorkspace.id,
          kind: "agent"
        }
      },
      include: {
        membership: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    db.authEvent.findMany({
      where: {
        workspaceId: activeWorkspace.id
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
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
        .filter((member) => member.kind === "agent")
        .map((member) => ({
          id: member.id,
          name: member.name,
          enabled: member.enabled,
          capabilities: member.capabilities,
          sourceSystem: member.sourceSystem ?? undefined
        })),
      openclaw: openclawIntegration
        ? {
            id: openclawIntegration.id,
            label: openclawIntegration.label ?? "",
            baseUrl: openclawIntegration.baseUrl,
            enabled: openclawIntegration.enabled,
            tokenConfigured: Boolean(openclawIntegration.gatewayToken),
            lastSyncAt: openclawIntegration.lastSyncAt ? openclawIntegration.lastSyncAt.toISOString() : null,
            lastSyncStatus: openclawIntegration.lastSyncStatus ?? null,
            lastSyncError: openclawIntegration.lastSyncError ?? null
          }
        : null,
      agentCredentials: credentials.map(mapAgentCredential),
      authEvents: authEvents.map(mapAuthEvent)
    }
  };
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

export async function getTaskWorkspaceForUi(taskId: string) {
  const payload = await getTaskResourceFromDb(taskId);

  if (!payload) {
    return null;
  }

  return {
    task: {
      id: payload.task.id,
      title: payload.task.title,
      projectSlug: payload.task.projectSlug,
      project: payload.task.project,
      description: payload.task.description ?? "",
      status: payload.task.status as TaskRecord["status"],
      priority: payload.task.priority as TaskRecord["priority"],
      assignee: payload.task.assignee,
      assigneeType: payload.task.assigneeType as TaskRecord["assigneeType"],
      reviewer: payload.task.reviewer ?? undefined,
      due: payload.task.due ? formatShortDate(new Date(payload.task.due)) : "No date",
      startDate: payload.task.startDate ? formatShortDate(new Date(payload.task.startDate)) : "No date",
      tags: payload.task.tags,
      effort: ((payload.task.effort as TaskRecord["effort"] | null) ?? "S"),
      contextHint: payload.task.contextHint ?? "",
      parentTaskId: payload.task.parentTaskId ?? undefined,
      parentTaskTitle: payload.task.parentTaskTitle ?? undefined,
      childCount: payload.task.childCount ?? 0,
      blockedReason: payload.task.blockedReason ?? undefined,
      assigneeCapabilities: payload.task.assigneeCapabilities ?? undefined,
      assigneeEnabled: payload.task.assigneeEnabled ?? true,
      assigneePermissions: payload.task.assigneePermissions ?? undefined,
      humanTransitionOptions: payload.task.humanTransitionOptions ?? undefined,
      transitionOptions: payload.task.transitionOptions ?? undefined
    },
    comments: payload.comments.map((comment) => ({
      id: comment.id,
      taskId: comment.taskId,
      author: comment.author,
      role: comment.role,
      tone: comment.tone as "human" | "agent",
      body: comment.body,
      time: formatRelativeTime(new Date(comment.time)),
      editedAt: comment.editedAt
    })),
    timeline: payload.activity.map(
      (item): TimelineEvent => ({
        taskId: item.taskId,
        label: item.label,
        detail: item.detail,
        time: formatRelativeTime(new Date(item.time))
      })
    ),
    executionFeed: payload.execution.logs,
    attachments: payload.attachments ?? [],
    childTasks: payload.child_tasks ?? [],
    watchers: payload.watchers ?? [],
    availableWatchers: payload.available_watchers ?? [],
    resolvedContext: {
      task: payload.resolved_context,
      workspace: mapContextBlock(payload.resolved_context.layers.workspace, "Workspace context"),
      project: Object.keys(payload.resolved_context.layers.project).length
        ? mapContextBlock(payload.resolved_context.layers.project, "Project context")
        : undefined
    }
  };
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

export async function getTaskEditFormData(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      parentTask: {
        select: {
          id: true,
          title: true
        }
      },
      project: {
        include: {
          memberships: {
            include: {
              membership: true
            },
            orderBy: { createdAt: "asc" }
          },
          tasks: {
            where: {
              id: {
                not: taskId
              }
            },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true
            }
          }
        }
      }
    }
  });

  if (!task) {
    return null;
  }

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId ?? "",
      parentTaskId: task.parentTaskId ?? "",
      tags: task.tags.join(", "),
      startDate: task.startDate ? task.startDate.toISOString().slice(0, 10) : "",
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      blockedReason: task.blockedReason ?? ""
    },
    project: {
      slug: task.project.slug,
      name: task.project.name
    },
    assignees: task.project.memberships.map(({ membership }) => ({
      id: membership.id,
      name: membership.name,
      label: `${membership.name} · ${membership.kind === "agent" ? "Agent" : "Human"}`
    })).filter((membership) => {
      const source = task.project.memberships.find((item) => item.membership.id === membership.id)?.membership;
      const projectRole = task.project.memberships.find((item) => item.membership.id === membership.id)?.role;
      return source ? canOwnProjectTask(source, projectRole) : false;
    }),
    parentOptions: task.project.tasks.map((item) => ({
      id: item.id,
      label: `${item.id} · ${item.title}`
    }))
  };
}

export async function getTaskCreateFormData(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: {
      slug,
      ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {})
    },
    include: {
      memberships: {
        include: {
          membership: true
        },
        orderBy: { createdAt: "asc" }
      },
      tasks: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  return {
    project: {
      slug: project.slug,
      name: project.name
    },
    assignees: project.memberships.map(({ membership }) => ({
      id: membership.id,
      name: membership.name,
      label: `${membership.name} · ${membership.kind === "agent" ? "Agent" : "Human"}`
    })).filter((membership) => {
      const source = project.memberships.find((item) => item.membership.id === membership.id)?.membership;
      const projectRole = project.memberships.find((item) => item.membership.id === membership.id)?.role;
      return source ? canOwnProjectTask(source, projectRole) : false;
    }),
    parentOptions: project.tasks.map((task) => ({
      id: task.id,
      label: `${task.id} · ${task.title}`
    }))
  };
}

export async function createProjectInDb(payload: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  visibility?: "workspace" | "project_members";
}) {
  const workspace = await getActiveWorkspaceRecord();

  if (!workspace) {
    return null;
  }

  const baseSlug = slugify(payload.name) || "project";
  let slug = baseSlug;
  let index = 2;

  while (
    await db.project.findFirst({
      where: {
        workspaceId: workspace.id,
        slug
      }
    })
  ) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  const description = payload.description?.trim() || null;
  const project = await db.project.create({
    data: {
      workspaceId: workspace.id,
      slug,
      name: payload.name.trim(),
      description,
      status: "active",
      visibility: payload.visibility ?? "workspace",
      startDate: payload.startDate ? new Date(`${payload.startDate}T00:00:00Z`) : null,
      endDate: payload.endDate ? new Date(`${payload.endDate}T00:00:00Z`) : null,
      context: {
        title: "Project context",
        summary: description ?? `${payload.name.trim()} is a new project without a detailed context brief yet.`,
        bullets: [
          "Keep scope explicit and simple.",
          "Let tasks inherit project context instead of rewriting it in every task."
        ]
      }
    }
  });

  const ownerMembership = await getDefaultHumanMembership(workspace.id);

  if (ownerMembership) {
    await db.projectMembership.create({
      data: {
        projectId: project.id,
        membershipId: ownerMembership.id,
        role: "lead"
      }
    });
  }

  const enabledOpenClawAgents = await db.membership.findMany({
    where: {
      workspaceId: workspace.id,
      kind: "agent",
      sourceSystem: "openclaw",
      enabled: true
    },
    select: {
      id: true
    }
  });

  if (enabledOpenClawAgents.length) {
    await db.projectMembership.createMany({
      data: enabledOpenClawAgents.map((membership) => ({
        projectId: project.id,
        membershipId: membership.id,
        role: "member" as const
      })),
      skipDuplicates: true
    });
  }

  return {
    id: project.id,
    slug: project.slug,
    name: project.name
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

  const current = await db.workspace.findFirst({
    where: { id: activeWorkspace.id }
  });

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


export async function getActiveWorkspaceOpenClawIntegration() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  if (!integration) {
    return null;
  }

  return {
    id: integration.id,
    label: integration.label ?? "",
    baseUrl: integration.baseUrl,
    enabled: integration.enabled,
    tokenConfigured: Boolean(integration.gatewayToken),
    lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toISOString() : null,
    lastSyncStatus: integration.lastSyncStatus ?? null,
    lastSyncError: integration.lastSyncError ?? null
  };
}

export async function upsertActiveWorkspaceOpenClawIntegrationInDb(payload: {
  label?: string;
  baseUrl: string;
  gatewayToken?: string;
  enabled?: boolean;
}) {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const existing = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  const nextToken = payload.gatewayToken?.trim() || existing?.gatewayToken;

  if (!nextToken) {
    return { error: "GATEWAY_TOKEN_REQUIRED" } as const;
  }

  const integration = await db.workspaceOpenClawIntegration.upsert({
    where: { workspaceId: activeWorkspace.id },
    update: {
      label: payload.label?.trim() || null,
      baseUrl: payload.baseUrl.trim().replace(/\/+$/, ""),
      gatewayToken: nextToken,
      enabled: payload.enabled ?? existing?.enabled ?? true,
      lastSyncError: existing?.lastSyncError ?? null
    },
    create: {
      workspaceId: activeWorkspace.id,
      label: payload.label?.trim() || null,
      baseUrl: payload.baseUrl.trim().replace(/\/+$/, ""),
      gatewayToken: nextToken,
      enabled: payload.enabled ?? true
    }
  });

  return {
    id: integration.id,
    label: integration.label ?? "",
    baseUrl: integration.baseUrl,
    enabled: integration.enabled,
    tokenConfigured: Boolean(integration.gatewayToken),
    lastSyncAt: integration.lastSyncAt ? integration.lastSyncAt.toISOString() : null,
    lastSyncStatus: integration.lastSyncStatus ?? null,
    lastSyncError: integration.lastSyncError ?? null
  };
}

export async function syncActiveWorkspaceOpenClawAgentsInDb() {
  const activeWorkspace = await getActiveWorkspaceRecord();

  if (!activeWorkspace) {
    return null;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  if (!integration || !integration.enabled) {
    return { error: "OPENCLAW_NOT_CONFIGURED" } as const;
  }

  try {
    const agents = await fetchOpenClawAgents({
      baseUrl: integration.baseUrl,
      gatewayToken: integration.gatewayToken
    });

    const existing = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        sourceSystem: "openclaw"
      }
    });

    const seen = new Set<string>();

    for (const agent of agents) {
      seen.add(agent.id);
      await db.membership.upsert({
        where: {
          workspaceId_sourceSystem_sourceKey: {
            workspaceId: activeWorkspace.id,
            sourceSystem: "openclaw",
            sourceKey: agent.id
          }
        },
        update: {
          name: agent.name,
          capabilities: agent.capabilities,
          enabled: true,
          agentPermissions: ["task.transitions", "task.comments", "task.execution"]
        },
        create: {
          workspaceId: activeWorkspace.id,
          name: agent.name,
          kind: "agent",
          sourceSystem: "openclaw",
          sourceKey: agent.id,
          capabilities: agent.capabilities,
          enabled: true,
          agentPermissions: ["task.transitions", "task.comments", "task.execution"]
        }
      });
    }

    for (const member of existing.filter((item) => item.sourceKey && !seen.has(item.sourceKey))) {
      await db.membership.update({
        where: { id: member.id },
        data: { enabled: false }
      });
    }

    const activeOpenClawMemberships = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        kind: "agent",
        sourceSystem: "openclaw",
        enabled: true
      },
      select: {
        id: true
      }
    });

    const workspaceProjects = await db.project.findMany({
      where: {
        workspaceId: activeWorkspace.id
      },
      select: {
        id: true
      }
    });

    for (const project of workspaceProjects) {
      const existingProjectMemberships = await db.projectMembership.findMany({
        where: { projectId: project.id },
        select: { membershipId: true }
      });
      const existingIds = new Set(existingProjectMemberships.map((entry) => entry.membershipId));
      const missingAgentIds = activeOpenClawMemberships
        .map((membership) => membership.id)
        .filter((membershipId) => !existingIds.has(membershipId));

      if (missingAgentIds.length) {
        await db.projectMembership.createMany({
          data: missingAgentIds.map((membershipId) => ({
            projectId: project.id,
            membershipId,
            role: "member" as const
          })),
          skipDuplicates: true
        });
      }
    }

    const updatedIntegration = await db.workspaceOpenClawIntegration.update({
      where: { workspaceId: activeWorkspace.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null
      }
    });

    await db.authEvent.create({
      data: {
        workspaceId: activeWorkspace.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.sync_succeeded",
        detail: `Synced ${agents.length} OpenClaw agent${agents.length === 1 ? "" : "s"}`
      }
    });

    return {
      integration: {
        id: updatedIntegration.id,
        label: updatedIntegration.label ?? "",
        baseUrl: updatedIntegration.baseUrl,
        enabled: updatedIntegration.enabled,
        tokenConfigured: true,
        lastSyncAt: updatedIntegration.lastSyncAt ? updatedIntegration.lastSyncAt.toISOString() : null,
        lastSyncStatus: updatedIntegration.lastSyncStatus ?? null,
        lastSyncError: updatedIntegration.lastSyncError ?? null
      },
      agents
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenClaw sync failed.";

    const updatedIntegration = await db.workspaceOpenClawIntegration.update({
      where: { workspaceId: activeWorkspace.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "error",
        lastSyncError: message
      }
    });

    await db.authEvent.create({
      data: {
        workspaceId: activeWorkspace.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.sync_failed",
        detail: message
      }
    });

    return {
      error: "OPENCLAW_SYNC_FAILED",
      message,
      integration: updatedIntegration
    } as const;
  }
}

export async function setProjectMembersInDb(
  slug: string,
  entries: Array<{ membershipId: string; role?: "lead" | "member" | "observer" }> | string[]
) {
  const project = await db.project.findFirst({
    where: { slug },
    include: {
      workspace: {
        include: {
          memberships: true
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  const allowedIds = new Set(project.workspace.memberships.map((membership) => membership.id));
  const normalizedEntries = entries.map((entry) =>
    typeof entry === "string" ? { membershipId: entry, role: "member" as const } : { membershipId: entry.membershipId, role: entry.role ?? "member" }
  );
  const nextEntries = Array.from(
    new Map(
      normalizedEntries
        .filter((entry) => allowedIds.has(entry.membershipId))
        .map((entry) => [entry.membershipId, entry])
    ).values()
  );
  const nextIds = nextEntries.map((entry) => entry.membershipId);
  const blockedOwnerIds = new Set(nextEntries.filter((entry) => entry.role === "observer").map((entry) => entry.membershipId));

  await db.projectMembership.deleteMany({
    where: {
      projectId: project.id
    }
  });

  if (nextIds.length) {
    await db.projectMembership.createMany({
      data: nextEntries.map((entry) => ({
        projectId: project.id,
        membershipId: entry.membershipId,
        role: entry.role
      }))
    });
  }

  await db.task.updateMany({
    where: nextIds.length
      ? {
          projectId: project.id,
          assigneeId: {
            notIn: nextIds
          }
        }
      : {
          projectId: project.id,
          assigneeId: {
            not: null
          }
        },
    data: {
      assigneeId: null
    }
  });

  if (blockedOwnerIds.size) {
    await db.task.updateMany({
      where: {
        projectId: project.id,
        assigneeId: {
          in: Array.from(blockedOwnerIds)
        }
      },
      data: {
        assigneeId: null
      }
    });
  }

  await db.task.updateMany({
    where: nextIds.length
      ? {
          projectId: project.id,
          reviewerId: {
            notIn: nextIds
          }
        }
      : {
          projectId: project.id,
          reviewerId: {
            not: null
          }
        },
    data: {
      reviewerId: null
    }
  });

  if (blockedOwnerIds.size) {
    await db.task.updateMany({
      where: {
        projectId: project.id,
        reviewerId: {
          in: Array.from(blockedOwnerIds)
        }
      },
      data: {
        reviewerId: null
      }
    });
  }

  return {
    project: {
      slug: project.slug,
      memberCount: nextIds.length
    }
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

export async function createTaskInDb(projectSlug: string, payload: {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "review" | "blocked" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  startDate?: string | null;
  dueDate?: string | null;
}) {
  const project = await db.project.findFirst({
    where: { slug: projectSlug },
    include: {
      memberships: true
    }
  });

  if (!project) {
    return null;
  }

  if (project.status === "archived") {
    return {
      error: "PROJECT_ARCHIVED"
    } as const;
  }

  const allowedAssignees = new Set(project.memberships.map((item) => item.membershipId));
  const projectRoleByMembership = new Map(project.memberships.map((item) => [item.membershipId, item.role]));

  if (payload.assigneeId && !allowedAssignees.has(payload.assigneeId)) {
    return {
      error: "ASSIGNEE_NOT_IN_PROJECT"
    } as const;
  }

  if (payload.assigneeId) {
    const assignee = await db.membership.findUnique({
      where: { id: payload.assigneeId },
      select: {
        enabled: true,
        kind: true,
        workspaceRole: true
      }
    });

    if (!assignee?.enabled) {
      return {
        error: "ASSIGNEE_DISABLED"
      } as const;
    }

    if (!canOwnProjectTask(assignee, projectRoleByMembership.get(payload.assigneeId))) {
      return {
        error: projectRoleByMembership.get(payload.assigneeId) === "observer" ? "ASSIGNEE_OBSERVER" : "ASSIGNEE_VIEWER"
      } as const;
    }
  }

  if (payload.parentTaskId) {
    const parent = await db.task.findUnique({
      where: { id: payload.parentTaskId },
      select: {
        id: true,
        projectId: true
      }
    });

    if (!parent || parent.projectId !== project.id) {
      return {
        error: "PARENT_NOT_IN_PROJECT"
      } as const;
    }
  }

  const taskId = await generateTaskId(project.slug);
  const task = await db.task.create({
    data: {
      id: taskId,
      projectId: project.id,
      parentTaskId: payload.parentTaskId || null,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      status: payload.status ?? "todo",
      priority: payload.priority ?? "medium",
      tags: payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
      assigneeId: payload.assigneeId || null,
      startDate: payload.startDate ? new Date(`${payload.startDate}T00:00:00Z`) : null,
      dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00Z`) : null
    }
  });

  await db.taskActivity.create({
    data: {
      taskId: task.id,
      label: "Task created",
      detail: `Task created in ${project.name}`
    }
  });

  return {
    id: task.id,
    projectSlug: project.slug
  };
}

export async function updateTaskInDb(taskId: string, payload: {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "review" | "blocked" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  blockedReason?: string | null;
}, actorType: "human" | "agent" = "human", actor?: { membershipId?: string | null; label?: string | null }) {
  const existing = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      project: {
        include: {
          memberships: true
        }
      },
      executions: {
        orderBy: { createdAt: "desc" },
        include: {
          logs: {
            orderBy: { createdAt: "asc" }
          }
        },
        take: 1
      }
    }
  });

  if (!existing) {
    return null;
  }

  const title = payload.title?.trim();
  const allowedAssignees = new Set(existing.project.memberships.map((item) => item.membershipId));
  const projectRoleByMembership = new Map(existing.project.memberships.map((item) => [item.membershipId, item.role]));

  if (payload.assigneeId && !allowedAssignees.has(payload.assigneeId)) {
    return {
      error: "ASSIGNEE_NOT_IN_PROJECT"
    } as const;
  }

  if (payload.assigneeId) {
    const assignee = await db.membership.findUnique({
      where: { id: payload.assigneeId },
      select: {
        enabled: true,
        workspaceRole: true
      }
    });

    if (!assignee?.enabled) {
      return {
        error: "ASSIGNEE_DISABLED"
      } as const;
    }

    if (!canOwnProjectTask(assignee, projectRoleByMembership.get(payload.assigneeId))) {
      return {
        error: projectRoleByMembership.get(payload.assigneeId) === "observer" ? "ASSIGNEE_OBSERVER" : "ASSIGNEE_VIEWER"
      } as const;
    }
  }

  if (payload.parentTaskId) {
    if (payload.parentTaskId === taskId) {
      return {
        error: "PARENT_SELF_REFERENCE"
      } as const;
    }

    const parent = await db.task.findUnique({
      where: { id: payload.parentTaskId },
      select: {
        id: true,
        projectId: true
      }
    });

    if (!parent || parent.projectId !== existing.projectId) {
      return {
        error: "PARENT_NOT_IN_PROJECT"
      } as const;
    }
  }

  if (
    payload.status &&
    existing.assigneeId &&
    payload.status !== existing.status
  ) {
    const assignee = existing.assignee;

    if (actorType === "agent" && assignee?.kind === "agent" && !agentHasPermission(assignee, "change_status")) {
      await logPermissionDenied(taskId, assignee.id, assignee.name, `${assignee.name} attempted a status transition without change_status permission.`);
      return {
        error: "AGENT_PERMISSION_DENIED"
      } as const;
    }

    if (actorType === "agent" && !isAllowedAgentTransition(existing.status, payload.status)) {
      return {
        error: "INVALID_AGENT_STATUS_TRANSITION"
      } as const;
    }

    if (actorType === "human" && !isAllowedHumanTransition(existing.status, payload.status)) {
      return {
        error: "INVALID_HUMAN_STATUS_TRANSITION"
      } as const;
    }
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      title: title ?? existing.title,
      description: payload.description !== undefined ? payload.description.trim() || null : existing.description,
      status: payload.status ?? existing.status,
      priority: payload.priority ?? existing.priority,
      assigneeId: payload.assigneeId !== undefined ? payload.assigneeId || null : existing.assigneeId,
      parentTaskId: payload.parentTaskId !== undefined ? payload.parentTaskId || null : existing.parentTaskId,
      tags: payload.tags !== undefined ? payload.tags.map((tag) => tag.trim()).filter(Boolean) : existing.tags,
      startDate:
        payload.startDate !== undefined
          ? payload.startDate
            ? new Date(`${payload.startDate}T00:00:00Z`)
            : null
          : existing.startDate,
      dueDate:
        payload.dueDate !== undefined
          ? payload.dueDate
            ? new Date(`${payload.dueDate}T00:00:00Z`)
            : null
          : existing.dueDate,
      blockedReason:
        payload.blockedReason !== undefined ? payload.blockedReason?.trim() || null : existing.blockedReason
    }
  });

  await db.taskActivity.create({
    data: {
      taskId,
      actorId: actor?.membershipId ?? null,
      actorName: actor?.label ?? null,
      label: "Task updated",
      detail: actor?.label ? `Core task metadata was updated by ${actor.label}.` : "Core task metadata was updated from the product UI."
    }
  });

  if (
    payload.status === "done" &&
    existing.status !== "done" &&
    existing.assignee?.kind === "agent" &&
    agentHasPermission(existing.assignee, "comment")
  ) {
    const latestExecution = existing.executions[0];
    const summaryBody = getAgentCompletionSummary(
      updated.title,
      latestExecution?.summary ?? null,
      latestExecution?.logs.map((log) => log.line) ?? []
    );

    await db.comment.create({
      data: {
        taskId,
        authorId: existing.assignee.id,
        authorName: existing.assignee.name,
        authorRole: existing.assignee.roleLabel ?? "Agent",
        tone: "agent",
        body: summaryBody
      }
    });

    await db.taskActivity.create({
      data: {
        taskId,
        actorId: existing.assignee.id,
        actorName: existing.assignee.name,
        label: "Agent summary posted",
        detail: `${existing.assignee.name} generated a completion summary comment.`
      }
    });
  }

  return {
    id: updated.id,
    title: updated.title
  };
}

export async function updateWorkspaceRoleInDb(memberId: string, workspaceRole: "owner" | "admin" | "member" | "viewer") {
  const member = await db.membership.findUnique({
    where: { id: memberId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true
        }
      },
      reviewingTasks: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!member) {
    return null;
  }

  const updated = await db.membership.update({
    where: { id: memberId },
    data: {
      workspaceRole
    }
  });

  if (workspaceRole === "viewer") {
    await db.task.updateMany({
      where: { assigneeId: memberId },
      data: { assigneeId: null }
    });

    await db.task.updateMany({
      where: { reviewerId: memberId },
      data: { reviewerId: null }
    });

    const activityRows = [
      ...member.tasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: "Workspace role changed",
        detail: `${member.name} became a viewer and was removed from task ownership on ${task.title}.`
      })),
      ...member.reviewingTasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: "Workspace role changed",
        detail: `${member.name} became a viewer and was removed from review on ${task.title}.`
      }))
    ];

    if (activityRows.length) {
      await db.taskActivity.createMany({
        data: activityRows
      });
    }
  }

  return {
    id: updated.id,
    workspaceRole: formatWorkspaceRole(updated.workspaceRole),
    name: updated.name
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


function buildOpenClawTaskMessage(input: {
  taskId: string;
  projectSlug: string;
  taskTitle: string;
  taskDescription: string;
  taskContextHint: string;
}) {
  return [
    `You are handling Mission Control task ${input.taskId} in project ${input.projectSlug}.`,
    `Task title: ${input.taskTitle}`,
    input.taskDescription ? `Task description: ${input.taskDescription}` : "Task description: (none provided)",
    input.taskContextHint ? `Task context hint: ${input.taskContextHint}` : "Task context hint: (none provided)",
    "",
    "Respond with one concise final answer that can be posted directly as a human-facing task comment.",
    "Do not mention internal tools, hidden reasoning, or implementation details unless the task explicitly asks for them.",
    "If the task is unclear, respond with a short clarification request suitable for a task comment."
  ].join("\n");
}

export async function dispatchTaskToOpenClawInDb(taskId: string, options?: { webhookBaseUrl?: string | null }) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          workspace: true
        }
      },
      assignee: true
    }
  });

  if (!task) {
    return null;
  }

  if (!task.assignee || task.assignee.kind !== "agent" || task.assignee.sourceSystem !== "openclaw" || !task.assignee.sourceKey) {
    return { error: "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" } as const;
  }

  const integration = await db.workspaceOpenClawIntegration.findUnique({
    where: { workspaceId: task.project.workspaceId }
  });

  if (!integration || !integration.enabled) {
    return { error: "OPENCLAW_NOT_CONFIGURED" } as const;
  }

  const message = buildOpenClawTaskMessage({
    taskId: task.id,
    projectSlug: task.project.slug,
    taskTitle: task.title,
    taskDescription: task.description ?? "",
    taskContextHint: task.contextHint ?? ""
  });

  const webhookToken = process.env.OPENCLAW_WEBHOOK_TOKEN?.trim() || integration.gatewayToken;
  const webhookUrl = options?.webhookBaseUrl
    ? `${options.webhookBaseUrl.replace(/\/+$/, "")}/api/integrations/openclaw/webhook/${task.id}`
    : null;

  try {
    const dispatch = await dispatchOpenClawTaskRun({
      baseUrl: integration.baseUrl,
      gatewayToken: integration.gatewayToken,
      agentId: task.assignee.sourceKey,
      taskId: task.id,
      workspaceId: task.project.workspaceId,
      message,
      webhookUrl: webhookUrl ?? undefined,
      webhookToken
    });

    await appendExecutionLogInDb(task.id, `Dispatched to OpenClaw agent ${task.assignee.name}.`, {
      membershipId: task.assignee.id,
      label: task.assignee.name
    });

    let comment: Awaited<ReturnType<typeof createCommentInDb>> | null = null;

    if (dispatch.finalText) {
      comment = await createCommentInDb(task.id, {
        author: task.assignee.name,
        role: "Agent",
        tone: "agent",
        body: dispatch.finalText,
        membershipId: task.assignee.id
      });

      if (comment && !("error" in comment)) {
        await appendExecutionLogInDb(task.id, `OpenClaw returned a final response for ${task.assignee.name}.`, {
          membershipId: task.assignee.id,
          label: task.assignee.name
        });
      }

      if (comment && "error" in comment) {
        return { error: "OPENCLAW_COMMENT_WRITE_FAILED", message: "OpenClaw returned a response, but Mission Control could not post it as an agent comment." } as const;
      }
    } else {
      await appendExecutionLogInDb(task.id, `OpenClaw accepted dispatch for ${task.assignee.name}; awaiting webhook callback.`, {
        membershipId: task.assignee.id,
        label: task.assignee.name
      });
    }

    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: task.assignee.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.task_dispatched",
        detail: `Dispatched task ${task.id} to ${task.assignee.name}`
      }
    });

    return {
      taskId: task.id,
      agentId: task.assignee.id,
      openclawAgentId: task.assignee.sourceKey,
      responseId: dispatch.responseId,
      accepted: dispatch.accepted,
      webhookExpected: !dispatch.finalText,
      commentId: comment && !("error" in comment) ? comment.id : null
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenClaw task dispatch failed.";
    await db.authEvent.create({
      data: {
        workspaceId: task.project.workspaceId,
        membershipId: task.assignee.id,
        actorType: "owner",
        actorLabel: getOwnerAuthConfig().email,
        eventType: "openclaw.task_dispatch_failed",
        detail: message
      }
    });
    return { error: "OPENCLAW_DISPATCH_FAILED", message } as const;
  }
}


function extractOpenClawWebhookText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = extractOpenClawWebhookText(entry);
      if (text) return text;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["response", "message", "output", "output_text", "text", "finalText", "resultText", "summary"]) {
    const text = extractOpenClawWebhookText(record[key]);
    if (text) return text;
  }

  for (const key of ["result", "data", "details", "response"]) {
    const text = extractOpenClawWebhookText(record[key]);
    if (text) return text;
  }

  if (Array.isArray(record.content)) {
    for (const entry of record.content) {
      if (entry && typeof entry === "object") {
        const text = extractOpenClawWebhookText((entry as Record<string, unknown>).text);
        if (text) return text;
      }
    }
  }

  return null;
}

export async function handleOpenClawTaskWebhookInDb(taskId: string, payload: unknown) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignee: true
    }
  });

  if (!task) {
    return { error: "TASK_NOT_FOUND" } as const;
  }

  if (!task.assignee || task.assignee.kind !== "agent" || task.assignee.sourceSystem !== "openclaw") {
    return { error: "TASK_NOT_ASSIGNED_TO_OPENCLAW_AGENT" } as const;
  }

  const finalText = extractOpenClawWebhookText(payload);
  if (!finalText) {
    return { error: "NO_FINAL_TEXT" } as const;
  }

  const comment = await createCommentInDb(task.id, {
    author: task.assignee.name,
    role: "Agent",
    tone: "agent",
    body: finalText,
    membershipId: task.assignee.id
  });

  if (comment && "error" in comment) {
    return { error: "OPENCLAW_COMMENT_WRITE_FAILED" } as const;
  }

  await appendExecutionLogInDb(task.id, `OpenClaw webhook returned a final response for ${task.assignee.name}.`, {
    membershipId: task.assignee.id,
    label: task.assignee.name
  });

  return {
    ok: true as const,
    commentId: comment && !("error" in comment) ? comment.id : null
  };
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

export async function updateMemberEnabledInDb(memberId: string, enabled: boolean) {
  const member = await db.membership.findUnique({
    where: { id: memberId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true
        }
      },
      reviewingTasks: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!member) {
    return null;
  }

  if (member.kind !== "agent") {
    return {
      error: "ONLY_AGENTS_MUTABLE"
    } as const;
  }

  const updated = await db.membership.update({
    where: { id: memberId },
    data: {
      enabled
    }
  });

  if (!enabled) {
    await db.task.updateMany({
      where: { assigneeId: memberId },
      data: { assigneeId: null }
    });

    await db.task.updateMany({
      where: { reviewerId: memberId },
      data: { reviewerId: null }
    });

    const activityRows = [
      ...member.tasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: "Agent disabled",
        detail: `${member.name} was disabled and removed from assignment on ${task.title}.`
      })),
      ...member.reviewingTasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: "Agent disabled",
        detail: `${member.name} was disabled and removed from review on ${task.title}.`
      }))
    ];

    if (activityRows.length) {
      await db.taskActivity.createMany({
        data: activityRows
      });
    }
  }

  return {
    id: updated.id,
    enabled: updated.enabled,
    name: updated.name
  };
}

export async function updateAgentPermissionsInDb(memberId: string, agentPermissions: string[]) {
  const member = await db.membership.findUnique({
    where: { id: memberId }
  });

  if (!member) {
    return null;
  }

  if (member.kind !== "agent") {
    return {
      error: "ONLY_AGENTS_MUTABLE"
    } as const;
  }

  const allowed = ["comment", "change_status", "log_execution"];
  const normalized = Array.from(new Set(agentPermissions.filter((permission) => allowed.includes(permission))));

  const updated = await db.membership.update({
    where: { id: memberId },
    data: {
      agentPermissions: normalized
    }
  });

  return {
    id: updated.id,
    agentPermissions: updated.agentPermissions,
    name: updated.name
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
