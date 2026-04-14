import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { ProjectSummary } from "@/lib/demo-data";
import { mapContextBlock } from "@/lib/context-block";
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

async function getDefaultHumanMembership(workspaceId: string) {
  return (
    (await db.membership.findFirst({
      where: { workspaceId, kind: "human", enabled: true, userId: { not: null } },
      orderBy: { createdAt: "asc" }
    })) ??
    (await db.membership.findFirst({
      where: { workspaceId, kind: "human", enabled: true },
      orderBy: { createdAt: "asc" }
    }))
  );
}

function formatProjectVisibility(visibility: string): NonNullable<ProjectSummary["visibility"]> {
  return visibility === "project_members" ? "Project members" : "Workspace";
}

function formatProjectLifecycle(status: string): NonNullable<ProjectSummary["lifecycle"]> {
  return status === "archived" ? "Archived" : "Active";
}

function formatWorkspaceRole(role: string) {
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

function formatShortDate(date: Date | null | undefined) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function buildProjectVisibilityWhere(visibilityMembershipId?: string | null) {
  if (!visibilityMembershipId) return undefined;
  return {
    OR: [
      { visibility: "workspace" as const },
      { memberships: { some: { membershipId: visibilityMembershipId } } }
    ]
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
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
    const memberIds = new Set(project.tasks.flatMap((task) => [task.assigneeId, task.reviewerId].filter((value): value is string => Boolean(value))));

    return {
      slug: project.slug,
      name: project.name,
      description: project.description ?? "",
      status: project.tasks.some((task) => task.status === "blocked")
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

export async function getProjectContextBlockForUi(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: { slug, ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}) }
  });
  return project ? mapContextBlock(project.context, "Project context") : null;
}

export async function getProjectMembersForUi(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: { slug, ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}) },
    include: {
      workspace: { include: { memberships: { where: { enabled: true }, orderBy: { createdAt: "asc" } } } },
      memberships: { include: { membership: true }, orderBy: { createdAt: "asc" } }
    }
  });

  if (!project) return null;

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

export async function createProjectInDb(payload: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  visibility?: "workspace" | "project_members";
}) {
  const workspace = await getActiveWorkspaceRecord();
  if (!workspace) return null;

  const baseSlug = slugify(payload.name) || "project";
  let slug = baseSlug;
  let index = 2;

  while (await db.project.findFirst({ where: { workspaceId: workspace.id, slug } })) {
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
      data: { projectId: project.id, membershipId: ownerMembership.id, role: "lead" }
    });
  }

  const constructorDispatchableAgents = await getConstructorDispatchableAgentMemberships(workspace.id);

  if (constructorDispatchableAgents.length) {
    await db.projectMembership.createMany({
      data: constructorDispatchableAgents.map((membership) => ({
        projectId: project.id,
        membershipId: membership.id,
        role: "member" as const
      })),
      skipDuplicates: true
    });
  }

  return { id: project.id, slug: project.slug, name: project.name };
}

export async function getProjectEditDataForUi(slug: string) {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const project = await db.project.findFirst({
    where: { slug, ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}) }
  });
  if (!project) return null;
  return {
    slug: project.slug,
    name: project.name,
    description: project.description ?? "",
    status: project.status as "active" | "archived",
    visibility: project.visibility as "workspace" | "project_members",
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : "",
    endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : ""
  };
}

export async function updateProjectInDb(
  slug: string,
  payload: {
    name?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    visibility?: "workspace" | "project_members";
    status?: "active" | "archived";
  }
) {
  const project = await db.project.findFirst({ where: { slug } });
  if (!project) return null;
  const updated = await db.project.update({
    where: { id: project.id },
    data: {
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description.trim() || null } : {}),
      ...(payload.visibility ? { visibility: payload.visibility } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.startDate !== undefined ? { startDate: payload.startDate ? new Date(`${payload.startDate}T00:00:00Z`) : null } : {}),
      ...(payload.endDate !== undefined ? { endDate: payload.endDate ? new Date(`${payload.endDate}T00:00:00Z`) : null } : {})
    }
  });
  return {
    slug: updated.slug,
    name: updated.name,
    description: updated.description ?? "",
    status: updated.status as "active" | "archived",
    visibility: updated.visibility as "workspace" | "project_members",
    startDate: updated.startDate?.toISOString().slice(0, 10) ?? "",
    endDate: updated.endDate?.toISOString().slice(0, 10) ?? ""
  };
}

export async function deleteProjectInDb(slug: string) {
  const project = await db.project.findFirst({ where: { slug } });
  if (!project) return null;
  await db.project.delete({ where: { id: project.id } });
  return { slug };
}

export async function setProjectMembersInDb(
  slug: string,
  entries: Array<{ membershipId: string; role?: "lead" | "member" | "observer" }> | string[]
) {
  const project = await db.project.findFirst({
    where: { slug },
    include: { workspace: { include: { memberships: true } } }
  });

  if (!project) return null;

  const allowedIds = new Set(project.workspace.memberships.map((membership) => membership.id));
  const normalizedEntries = entries.map((entry) =>
    typeof entry === "string" ? { membershipId: entry, role: "member" as const } : { membershipId: entry.membershipId, role: entry.role ?? "member" }
  );
  const nextEntries = Array.from(
    new Map(
      normalizedEntries.filter((entry) => allowedIds.has(entry.membershipId)).map((entry) => [entry.membershipId, entry])
    ).values()
  );
  const nextIds = nextEntries.map((entry) => entry.membershipId);
  const blockedOwnerIds = new Set(nextEntries.filter((entry) => entry.role === "observer").map((entry) => entry.membershipId));

  await db.projectMembership.deleteMany({ where: { projectId: project.id } });

  if (nextIds.length) {
    await db.projectMembership.createMany({
      data: nextEntries.map((entry) => ({ projectId: project.id, membershipId: entry.membershipId, role: entry.role }))
    });
  }

  await db.task.updateMany({
    where: nextIds.length ? { projectId: project.id, assigneeId: { notIn: nextIds } } : { projectId: project.id, assigneeId: { not: null } },
    data: { assigneeId: null }
  });

  if (blockedOwnerIds.size) {
    await db.task.updateMany({
      where: { projectId: project.id, assigneeId: { in: Array.from(blockedOwnerIds) } },
      data: { assigneeId: null }
    });
  }

  await db.task.updateMany({
    where: nextIds.length ? { projectId: project.id, reviewerId: { notIn: nextIds } } : { projectId: project.id, reviewerId: { not: null } },
    data: { reviewerId: null }
  });

  if (blockedOwnerIds.size) {
    await db.task.updateMany({
      where: { projectId: project.id, reviewerId: { in: Array.from(blockedOwnerIds) } },
      data: { reviewerId: null }
    });
  }

  return {
    project: {
      slug: project.slug,
      memberCount: nextIds.length
    }
  };
}
