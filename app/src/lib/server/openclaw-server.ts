import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getOwnerAuthConfig } from "@/lib/auth";
import { DEFAULT_WORKSPACE_SLUG, ACTIVE_WORKSPACE_COOKIE_NAME } from "@/lib/workspace-session";
import { fetchOpenClawAgents } from "@/lib/openclaw";

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
