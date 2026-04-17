import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Member } from "@/lib/demo-data";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";
import { getRequestI18n } from "@/lib/i18n/server";
import { formatLocalizedWorkspaceRole, localizeMemberRoleLabel, localizeSystemMemberName } from "@/lib/member-display";

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

function formatWorkspaceRole(role: string, t: Awaited<ReturnType<typeof getRequestI18n>>["t"]): NonNullable<Member["workspaceRole"]> {
  type WorkspaceRoleLabel = NonNullable<Member["workspaceRole"]>;
  return formatLocalizedWorkspaceRole(role, t) as WorkspaceRoleLabel;
}

export async function getMembersForUi() {
  const activeWorkspace = await getActiveWorkspaceRecord();
  const { t } = await getRequestI18n();
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
      name: localizeSystemMemberName(member.name, t) ?? member.name,
      type: member.kind === "agent" ? "Agent" : "Human",
      role: localizeMemberRoleLabel(member, t),
      workspaceRole: formatWorkspaceRole(member.workspaceRole, t),
      email: member.email ?? undefined,
      avatarUrl: member.avatarUrl ?? undefined,
      capabilities: member.capabilities,
      agentPermissions: member.kind === "agent" ? member.agentPermissions : [],
      active: member.enabled,
      load: member.enabled ? t("membersServer.activeTasks", { count: member.tasks.length }) : t("membersServer.disabled"),
      projects: Array.from(new Set(member.tasks.map((task) => task.project.name))),
      taskCount: member.tasks.length
    })
  );
}

export async function updateWorkspaceRoleInDb(memberId: string, workspaceRole: "owner" | "admin" | "member" | "viewer") {
  const { t } = await getRequestI18n();
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
        label: t("membersServer.workspaceRoleChanged"),
        detail: t("membersServer.becameViewerRemovedFromOwnership", { memberName: member.name, taskTitle: task.title })
      })),
      ...member.reviewingTasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: t("membersServer.workspaceRoleChanged"),
        detail: t("membersServer.becameViewerRemovedFromReview", { memberName: member.name, taskTitle: task.title })
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
    workspaceRole: formatWorkspaceRole(updated.workspaceRole, t),
    name: updated.name
  };
}

export async function updateMemberEnabledInDb(memberId: string, enabled: boolean) {
  const { t } = await getRequestI18n();
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
        label: t("membersServer.agentDisabled"),
        detail: t("membersServer.agentDisabledRemovedFromAssignment", { memberName: member.name, taskTitle: task.title })
      })),
      ...member.reviewingTasks.map((task) => ({
        taskId: task.id,
        actorId: memberId,
        actorName: member.name,
        label: t("membersServer.agentDisabled"),
        detail: t("membersServer.agentDisabledRemovedFromReview", { memberName: member.name, taskTitle: task.title })
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
