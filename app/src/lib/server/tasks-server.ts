import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { ContextBlock, TaskRecord, TimelineEvent } from "@/lib/demo-data";
import { resolveTaskContext } from "@/lib/context-resolver";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";

async function getActiveWorkspaceSlug() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE_NAME)?.value || DEFAULT_WORKSPACE_SLUG;
}

async function getActiveWorkspaceRecord() {
  const activeSlug = await getActiveWorkspaceSlug();
  return (
    (await db.workspace.findFirst({ where: { slug: activeSlug } })) ??
    (await db.workspace.findFirst({ where: { slug: DEFAULT_WORKSPACE_SLUG } })) ??
    (await db.workspace.findFirst({ orderBy: { createdAt: "asc" } }))
  );
}

async function getDefaultHumanMembership(workspaceId: string) {
  return (
    (await db.membership.findFirst({ where: { workspaceId, kind: "human", enabled: true, userId: { not: null } }, orderBy: { createdAt: "asc" } })) ??
    (await db.membership.findFirst({ where: { workspaceId, kind: "human", enabled: true }, orderBy: { createdAt: "asc" } }))
  );
}

function formatShortDate(date: Date | null | undefined) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function mapContextBlock(value: unknown, fallbackTitle: string): ContextBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { title: fallbackTitle, summary: "", bullets: [] };
  const record = value as Record<string, unknown>;
  return {
    title: typeof record.title === "string" && record.title.trim() ? record.title : fallbackTitle,
    summary: typeof record.summary === "string" ? record.summary : "",
    bullets: Array.isArray(record.bullets) ? record.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
  };
}

function formatStatus(status: string): TaskRecord["status"] {
  if (status === "in_progress") return "In Progress";
  if (status === "review") return "In Review";
  if (status === "done") return "Done";
  if (status === "blocked") return "Blocked";
  return "Todo";
}

function formatPriority(priority: string): TaskRecord["priority"] {
  return (priority.charAt(0).toUpperCase() + priority.slice(1)) as TaskRecord["priority"];
}

function mapComment(comment: any) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: comment.authorName,
    role: comment.authorRole,
    tone: comment.tone,
    body: comment.body,
    time: comment.createdAt.toISOString(),
    editedAt: comment.updatedAt && comment.updatedAt.getTime() !== comment.createdAt.getTime() ? comment.updatedAt.toISOString() : null
  };
}

function mapAttachment(attachment: any) {
  const previewable = attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf" || attachment.mimeType.startsWith("text/");
  const previewKind: "image" | "document" | "text" | undefined = attachment.mimeType.startsWith("image/")
    ? "image"
    : attachment.mimeType.startsWith("text/")
      ? "text"
      : previewable
        ? "document"
        : undefined;
  return {
    id: attachment.id,
    name: attachment.originalName,
    mimeType: attachment.mimeType,
    artifactType: attachment.artifactType,
    sizeLabel: `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB`,
    href: `/api/attachments/${attachment.id}`,
    previewHref: previewable ? `/api/attachments/${attachment.id}/preview` : undefined,
    previewKind,
    previewable,
    uploadedAt: formatRelativeTime(attachment.createdAt),
    author: attachment.author?.name ?? attachment.authorName ?? "Workspace Owner"
  };
}

function mapActivity(item: any) {
  return {
    taskId: item.taskId,
    label: item.label,
    detail: item.detail,
    time: item.createdAt.toISOString()
  };
}

function mapWatcher(member: any) {
  return {
    id: member.id,
    name: member.name,
    type: (member.kind === "agent" ? "Agent" : "Human") as "Agent" | "Human"
  };
}

function mapTaskRecord(task: any): TaskRecord {
  return {
    id: task.id,
    title: task.title,
    project: task.project.name,
    projectSlug: task.project.slug,
    status: formatStatus(task.status),
    priority: formatPriority(task.priority),
    assignee: task.assignee?.name ?? "Unassigned",
    assigneeType: task.assignee?.kind === "agent" ? "Agent" : "Human",
    reviewer: task.reviewer?.name ?? undefined,
    due: formatShortDate(task.dueDate),
    startDate: formatShortDate(task.startDate),
    tags: task.tags,
    effort: (task.effort ?? "S") as TaskRecord["effort"],
    parentTaskId: task.parentTask?.id ?? undefined,
    parentTaskTitle: task.parentTask?.title ?? undefined,
    childCount: task.childTasks?.length ?? 0,
    blockedReason: task.blockedReason ?? undefined,
    description: task.description ?? "",
    contextHint: task.contextHint ?? ""
  };
}

function buildBoardColumns(items: TaskRecord[]) {
  const base = [
    { title: "Todo", accent: "slate" },
    { title: "In Progress", accent: "blue" },
    { title: "In Review", accent: "gold" },
    { title: "Blocked", accent: "red" },
    { title: "Done", accent: "emerald" }
  ] as const;

  return base.map((column) => {
    const cards = items
      .filter((item) => item.status === column.title)
      .map((item) => ({
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        priority: item.priority,
        eta: item.due,
        effort: item.effort,
        project: item.project,
        tags: item.tags,
        childCount: item.childCount,
        parentTaskTitle: item.parentTaskTitle ?? null
      }));

    return {
      title: column.title,
      count: cards.length,
      accent: column.accent,
      cards
    };
  });
}

function canOwnProjectTask(member: { enabled: boolean; workspaceRole?: string | null } | null | undefined, projectRole?: string | null) {
  if (!member?.enabled) return false;
  if (member.workspaceRole === "viewer") return false;
  if (projectRole === "observer") return false;
  return true;
}

function transitionLabel(value: "todo" | "in_progress" | "review" | "blocked" | "done") {
  switch (value) {
    case "in_progress":
      return "In Progress";
    case "review":
      return "In Review";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    default:
      return "Todo";
  }
}

function getHumanTransitionOptions(status: string) {
  const all = ["todo", "in_progress", "review", "blocked", "done"] as const;
  return all.filter((item) => item !== status).map((value) => ({ value, label: transitionLabel(value) }));
}

function getAgentTransitionOptions(status: string) {
  const matrix: Record<string, Array<"todo" | "in_progress" | "review" | "blocked" | "done">> = {
    todo: ["in_progress", "blocked"],
    in_progress: ["review", "blocked", "done"],
    review: ["in_progress", "done", "blocked"],
    blocked: ["in_progress"],
    done: []
  };
  return (matrix[status] ?? []).map((value) => ({ value, label: transitionLabel(value) }));
}

function isAllowedHumanTransition(current: string, next: string) {
  return current !== next;
}

function isAllowedAgentTransition(current: string, next: string) {
  return getAgentTransitionOptions(current).some((option: any) => (typeof option === "string" ? option : option.value) === next);
}

function agentHasPermission(member: { kind?: string; agentPermissions?: string[] } | null | undefined, permission: string) {
  if (member?.kind !== "agent" || !Array.isArray(member.agentPermissions)) {
    return false;
  }

  const aliases: Record<string, string[]> = {
    "tasks.write": ["tasks.write", "change_status", "task.transitions"],
    "comments.write": ["comments.write", "comment", "task.comments"],
    "execution.write": ["execution.write", "log_execution", "task.execution"]
  };

  const allowed = aliases[permission] ?? [permission];
  return allowed.some((value) => member.agentPermissions?.includes(value));
}

async function logPermissionDenied(taskId: string, actorId: string | null, actorName: string, detail: string) {
  await db.taskActivity.create({ data: { taskId, actorId: actorId ?? undefined, actorName, label: "Permission denied", detail } });
}

async function generateTaskId(projectSlug: string) {
  const prefix = projectSlug.split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3) || "TSK";
  const latest = await db.task.findFirst({ where: { project: { slug: projectSlug } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  const num = latest?.id.match(/-(\d+)$/)?.[1] ? Number(latest.id.match(/-(\d+)$/)?.[1]) + 1 : 1;
  return `${prefix}-${String(num).padStart(3, "0")}`;
}

export async function getTaskResourceFromDb(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { workspace: true } },
      assignee: true,
      reviewer: true,
      parentTask: { select: { id: true, title: true } },
      childTasks: { orderBy: { createdAt: "asc" }, select: { id: true, title: true, status: true } },
      watchers: { orderBy: { createdAt: "asc" }, include: { membership: true } },
      comments: { orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "desc" }, include: { author: true } },
      activity: { orderBy: { createdAt: "asc" } },
      executions: { orderBy: { createdAt: "desc" }, include: { agent: true, logs: { orderBy: { createdAt: "asc" } } } }
    }
  });
  if (!task) return null;
  const latestExecution = task.executions[0] ?? null;
  const resolvedContext = resolveTaskContext({ workspace: task.project.workspace.context, project: task.project.context, taskHint: task.contextHint });
  const availableWatchers = await db.projectMembership.findMany({ where: { projectId: task.projectId }, include: { membership: true }, orderBy: { createdAt: "asc" } });
  return {
    task: {
      id: task.id,
      title: task.title,
      projectSlug: task.project.slug,
      project: task.project.name,
      description: task.description,
      status: formatStatus(task.status),
      priority: formatPriority(task.priority),
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
      contextHint: task.contextHint,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    },
    watchers: task.watchers.map((watcher) => mapWatcher(watcher.membership)),
    available_watchers: availableWatchers.map((item) => item.membership).filter((member) => member.enabled).map(mapWatcher),
    resolved_context: resolvedContext,
    comments: task.comments.map(mapComment),
    attachments: task.attachments.map(mapAttachment),
    child_tasks: task.childTasks.map((child) => ({ id: child.id, title: child.title, status: formatStatus(child.status) })),
    activity: task.activity.map(mapActivity),
    execution: {
      latest_status: latestExecution?.status ?? null,
      latest_created_at: latestExecution?.createdAt?.toISOString() ?? null,
      latest_updated_at: latestExecution?.updatedAt?.toISOString() ?? null,
      logs: latestExecution?.logs.map((log) => log.line) ?? []
    }
  };
}

export async function getTasksForUi(filters?: { projectSlug?: string; assigneeName?: string; agentOnly?: boolean; status?: "todo" | "in_progress" | "review" | "blocked" | "done"; }) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const tasks = await db.task.findMany({
    where: {
      project: { ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}), ...(filters?.projectSlug ? { slug: filters.projectSlug } : {}) },
      ...(filters?.assigneeName ? { assignee: { name: filters.assigneeName } } : {}),
      ...(filters?.agentOnly ? { assignee: { kind: "agent" } } : {}),
      ...(filters?.status ? { status: filters.status } : {})
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: { project: true, parentTask: { select: { id: true, title: true } }, childTasks: { select: { id: true } }, assignee: true, reviewer: true }
  });
  return tasks.map(mapTaskRecord);
}

export async function getMyTasksForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const ownerMembership = activeWorkspace ? await getDefaultHumanMembership(activeWorkspace.id) : null;
  const tasks = await db.task.findMany({
    where: {
      ...(activeWorkspace ? { project: { workspaceId: activeWorkspace.id } } : {}),
      OR: ownerMembership ? [{ assigneeId: ownerMembership.id }, { assignee: { kind: "agent" } }] : [{ assignee: { kind: "agent" } }]
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: { project: true, parentTask: { select: { id: true, title: true } }, childTasks: { select: { id: true } }, assignee: true, reviewer: true }
  });
  return tasks.map(mapTaskRecord);
}

export async function getTaskWorkspaceForUi(taskId: string) {
  const payload = await getTaskResourceFromDb(taskId);
  if (!payload) return null;
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
      createdAt: payload.task.createdAt ?? undefined,
      updatedAt: payload.task.updatedAt ?? undefined,
      assigneeCapabilities: payload.task.assigneeCapabilities ?? undefined,
      assigneeEnabled: payload.task.assigneeEnabled ?? true,
      assigneePermissions: payload.task.assigneePermissions ?? undefined,
      humanTransitionOptions: payload.task.humanTransitionOptions ?? undefined,
      transitionOptions: payload.task.transitionOptions ?? undefined
    },
    comments: payload.comments.map((comment) => ({ ...comment, time: formatRelativeTime(new Date(comment.time)) })),
    timeline: payload.activity.map((item): TimelineEvent => ({ taskId: item.taskId, label: item.label, detail: item.detail, time: formatRelativeTime(new Date(item.time)) })),
    executionFeed: payload.execution.logs,
    executionMeta: {
      latestStatus: payload.execution.latest_status ?? undefined,
      latestCreatedAt: payload.execution.latest_created_at ?? undefined,
      latestUpdatedAt: payload.execution.latest_updated_at ?? undefined
    },
    attachments: payload.attachments ?? [],
    childTasks: payload.child_tasks ?? [],
    watchers: payload.watchers ?? [],
    availableWatchers: payload.available_watchers ?? [],
    resolvedContext: {
      task: payload.resolved_context,
      workspace: mapContextBlock(payload.resolved_context.layers.workspace, "Workspace context"),
      project: Object.keys(payload.resolved_context.layers.project).length ? mapContextBlock(payload.resolved_context.layers.project, "Project context") : undefined
    }
  };
}

export async function getTaskEditFormData(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      parentTask: { select: { id: true, title: true } },
      project: { include: { memberships: { include: { membership: true }, orderBy: { createdAt: "asc" } }, tasks: { where: { id: { not: taskId } }, orderBy: { createdAt: "asc" }, select: { id: true, title: true } } } }
    }
  });
  if (!task) return null;
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
    project: { slug: task.project.slug, name: task.project.name },
    assignees: task.project.memberships.map(({ membership }) => ({ id: membership.id, name: membership.name, label: `${membership.name} · ${membership.kind === "agent" ? "Agent" : "Human"}` })).filter((membership) => {
      const source = task.project.memberships.find((item) => item.membership.id === membership.id)?.membership;
      const projectRole = task.project.memberships.find((item) => item.membership.id === membership.id)?.role;
      return source ? canOwnProjectTask(source, projectRole) : false;
    }),
    parentOptions: task.project.tasks.map((item) => ({ id: item.id, label: `${item.id} · ${item.title}` }))
  };
}

export async function getTaskCreateFormData(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: { slug, ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}) },
    include: { memberships: { include: { membership: true }, orderBy: { createdAt: "asc" } }, tasks: { orderBy: { createdAt: "asc" }, select: { id: true, title: true } } }
  });
  if (!project) return null;
  return {
    project: { slug: project.slug, name: project.name },
    assignees: project.memberships.map(({ membership }) => ({ id: membership.id, name: membership.name, label: `${membership.name} · ${membership.kind === "agent" ? "Agent" : "Human"}` })).filter((membership) => {
      const source = project.memberships.find((item) => item.membership.id === membership.id)?.membership;
      const projectRole = project.memberships.find((item) => item.membership.id === membership.id)?.role;
      return source ? canOwnProjectTask(source, projectRole) : false;
    }),
    parentOptions: project.tasks.map((task) => ({ id: task.id, label: `${task.id} · ${task.title}` }))
  };
}

export async function createTaskInDb(projectSlug: string, payload: any) {
  const project = await db.project.findFirst({ where: { slug: projectSlug }, include: { memberships: true } });
  if (!project) return null;
  if (project.status === "archived") return { error: "PROJECT_ARCHIVED" } as const;

  const allowedAssignees = new Set(project.memberships.map((item) => item.membershipId));
  const projectRoleByMembership = new Map(project.memberships.map((item) => [item.membershipId, item.role]));
  if (payload.assigneeId && !allowedAssignees.has(payload.assigneeId)) return { error: "ASSIGNEE_NOT_IN_PROJECT" } as const;
  if (payload.assigneeId) {
    const assignee = await db.membership.findUnique({ where: { id: payload.assigneeId }, select: { enabled: true, kind: true, workspaceRole: true } });
    if (!assignee?.enabled) return { error: "ASSIGNEE_DISABLED" } as const;
    if (!canOwnProjectTask(assignee, projectRoleByMembership.get(payload.assigneeId))) {
      return { error: projectRoleByMembership.get(payload.assigneeId) === "observer" ? "ASSIGNEE_OBSERVER" : "ASSIGNEE_VIEWER" } as const;
    }
  }
  if (payload.parentTaskId) {
    const parent = await db.task.findUnique({ where: { id: payload.parentTaskId }, select: { id: true, projectId: true } });
    if (!parent || parent.projectId !== project.id) return { error: "PARENT_NOT_IN_PROJECT" } as const;
  }
  const taskId = await generateTaskId(project.slug);
  const task = await db.task.create({ data: { id: taskId, projectId: project.id, parentTaskId: payload.parentTaskId || null, title: payload.title.trim(), description: payload.description?.trim() || null, status: payload.status ?? "todo", priority: payload.priority ?? "medium", tags: payload.tags?.map((tag: string) => tag.trim()).filter(Boolean) ?? [], assigneeId: payload.assigneeId || null, startDate: payload.startDate ? new Date(`${payload.startDate}T00:00:00Z`) : null, dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00Z`) : null } });
  await db.taskActivity.create({ data: { taskId: task.id, label: "Task created", detail: `Task created in ${project.name}` } });
  return { id: task.id, projectSlug: project.slug };
}

export async function updateTaskInDb(taskId: string, payload: any, actorType: "human" | "agent" = "human", actor?: { membershipId?: string | null; label?: string | null; scopes?: string[] | null }) {
  const existing = await db.task.findUnique({ where: { id: taskId }, include: { assignee: true, project: { include: { memberships: true } }, executions: { orderBy: { createdAt: "desc" }, include: { logs: { orderBy: { createdAt: "asc" } } }, take: 1 } } });
  if (!existing) return null;
  const title = payload.title?.trim();
  const allowedAssignees = new Set(existing.project.memberships.map((item) => item.membershipId));
  const projectRoleByMembership = new Map(existing.project.memberships.map((item) => [item.membershipId, item.role]));
  if (payload.assigneeId && !allowedAssignees.has(payload.assigneeId)) return { error: "ASSIGNEE_NOT_IN_PROJECT" } as const;
  if (payload.assigneeId) {
    const assignee = await db.membership.findUnique({ where: { id: payload.assigneeId }, select: { enabled: true, workspaceRole: true } });
    if (!assignee?.enabled) return { error: "ASSIGNEE_DISABLED" } as const;
    if (!canOwnProjectTask(assignee, projectRoleByMembership.get(payload.assigneeId))) return { error: projectRoleByMembership.get(payload.assigneeId) === "observer" ? "ASSIGNEE_OBSERVER" : "ASSIGNEE_VIEWER" } as const;
  }
  if (payload.parentTaskId) {
    if (payload.parentTaskId === taskId) return { error: "PARENT_SELF_REFERENCE" } as const;
    const parent = await db.task.findUnique({ where: { id: payload.parentTaskId }, select: { id: true, projectId: true } });
    if (!parent || parent.projectId !== existing.projectId) return { error: "PARENT_NOT_IN_PROJECT" } as const;
  }
  if (payload.status && existing.assigneeId && payload.status !== existing.status) {
    const assignee = existing.assignee;
    if (actorType === "agent" && assignee?.kind === "agent") {
      const actorMatchesAssignee = Boolean(actor?.membershipId && actor.membershipId === assignee.id);
      const actorScopes = new Set((actor?.scopes ?? []).filter(Boolean));
      const actorHasStatusScope = ["tasks.write", "change_status", "task.transitions"].some((scope) => actorScopes.has(scope));
      const assigneeHasStatusPermission = agentHasPermission(assignee, "change_status");

      if (!actorMatchesAssignee || (!actorHasStatusScope && !assigneeHasStatusPermission)) {
        await logPermissionDenied(taskId, assignee.id, assignee.name, `${assignee.name} attempted a status transition without task transition permission.`);
        return { error: "AGENT_PERMISSION_DENIED" } as const;
      }
    }
    if (actorType === "agent" && !isAllowedAgentTransition(existing.status, payload.status)) return { error: "INVALID_AGENT_STATUS_TRANSITION" } as const;
    if (actorType === "human" && !isAllowedHumanTransition(existing.status, payload.status)) return { error: "INVALID_HUMAN_STATUS_TRANSITION" } as const;
  }
  const updated = await db.task.update({ where: { id: taskId }, data: { title: title ?? existing.title, description: payload.description !== undefined ? payload.description.trim() || null : existing.description, status: payload.status ?? existing.status, priority: payload.priority ?? existing.priority, assigneeId: payload.assigneeId !== undefined ? payload.assigneeId || null : existing.assigneeId, parentTaskId: payload.parentTaskId !== undefined ? payload.parentTaskId || null : existing.parentTaskId, tags: payload.tags !== undefined ? payload.tags.map((tag: string) => tag.trim()).filter(Boolean) : existing.tags, startDate: payload.startDate !== undefined ? (payload.startDate ? new Date(`${payload.startDate}T00:00:00Z`) : null) : existing.startDate, dueDate: payload.dueDate !== undefined ? (payload.dueDate ? new Date(`${payload.dueDate}T00:00:00Z`) : null) : existing.dueDate, blockedReason: payload.blockedReason !== undefined ? payload.blockedReason?.trim() || null : existing.blockedReason } });
  await db.taskActivity.create({ data: { taskId, actorId: actor?.membershipId ?? null, actorName: actor?.label ?? null, label: "Task updated", detail: actor?.label ? `Core task metadata was updated by ${actor.label}.` : "Core task metadata was updated from the product UI." } });
  return { id: updated.id, title: updated.title };
}

export function getBoardColumnsForUi(projectSlug?: string) {
  return getTasksForUi(projectSlug ? { projectSlug } : undefined).then(buildBoardColumns);
}
