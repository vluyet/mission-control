import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { fetchConstructorAgents } from "@/lib/constructor";
import { getOwnerAuthConfig } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n/server";
import { ACTIVE_WORKSPACE_COOKIE_NAME, DEFAULT_WORKSPACE_SLUG } from "@/lib/workspace-session";

const DEFAULT_AGENT_PERMISSIONS = ["comment", "change_status", "log_execution"];

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

export async function syncActiveWorkspaceConstructorAgentsInDb() {
  const [activeWorkspace, { t }] = await Promise.all([getActiveWorkspaceRecord(), getRequestI18n()]);

  if (!activeWorkspace) {
    return null;
  }

  const integration = await db.workspaceConstructorIntegration.findUnique({
    where: { workspaceId: activeWorkspace.id }
  });

  if (!integration || !integration.enabled || !integration.baseUrl.trim()) {
    return { error: "CONSTRUCTOR_SYNC_NOT_CONFIGURED" } as const;
  }

  const apiToken = integration.apiToken?.trim() || process.env.CONSTRUCTOR_API_TOKEN?.trim() || null;

  if (!apiToken) {
    return { error: "CONSTRUCTOR_API_TOKEN_REQUIRED" } as const;
  }

  try {
    const agents = await fetchConstructorAgents({
      baseUrl: integration.baseUrl,
      apiToken
    });

    const existing = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        sourceSystem: "constructor"
      }
    });

    const seen = new Set<string>();

    for (const agent of agents) {
      seen.add(agent.id);

      await db.membership.upsert({
        where: {
          workspaceId_sourceSystem_sourceKey: {
            workspaceId: activeWorkspace.id,
            sourceSystem: "constructor",
            sourceKey: agent.id
          }
        },
        update: {
          name: agent.name,
          capabilities: agent.capabilities,
          roleLabel: t("membersServer.agent"),
          kind: "agent",
          enabled: true,
          agentPermissions: DEFAULT_AGENT_PERMISSIONS
        },
        create: {
          workspaceId: activeWorkspace.id,
          name: agent.name,
          kind: "agent",
          roleLabel: t("membersServer.agent"),
          workspaceRole: "member",
          enabled: true,
          sourceSystem: "constructor",
          sourceKey: agent.id,
          capabilities: agent.capabilities,
          agentPermissions: DEFAULT_AGENT_PERMISSIONS
        }
      });
    }

    for (const member of existing.filter((item) => item.sourceKey && !seen.has(item.sourceKey))) {
      await db.membership.update({ where: { id: member.id }, data: { enabled: false } });
    }

    const activeConstructorMemberships = await db.membership.findMany({
      where: {
        workspaceId: activeWorkspace.id,
        kind: "agent",
        sourceSystem: "constructor",
        enabled: true
      },
      select: { id: true }
    });

    const workspaceProjects = await db.project.findMany({
      where: { workspaceId: activeWorkspace.id },
      select: { id: true }
    });

    for (const project of workspaceProjects) {
      const existingProjectMemberships = await db.projectMembership.findMany({
        where: { projectId: project.id },
        select: { membershipId: true }
      });
      const existingIds = new Set(existingProjectMemberships.map((entry) => entry.membershipId));
      const missingAgentIds = activeConstructorMemberships
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

    const updatedIntegration = await db.workspaceConstructorIntegration.update({
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
        eventType: "constructor.sync_succeeded",
        detail: `Synced ${agents.length} Constructor agent${agents.length === 1 ? "" : "s"}`
      }
    });

    return {
      integration: {
        id: updatedIntegration.id,
        label: updatedIntegration.label ?? "",
        baseUrl: updatedIntegration.baseUrl,
        enabled: updatedIntegration.enabled,
        apiToken: updatedIntegration.apiToken ?? null,
        callbackToken: updatedIntegration.callbackToken ?? null,
        apiTokenConfigured: Boolean(updatedIntegration.apiToken) || Boolean(process.env.CONSTRUCTOR_API_TOKEN?.trim()),
        callbackTokenConfigured: Boolean(updatedIntegration.callbackToken),
        lastSyncAt: updatedIntegration.lastSyncAt ? updatedIntegration.lastSyncAt.toISOString() : null,
        lastSyncStatus: updatedIntegration.lastSyncStatus ?? null,
        lastSyncError: updatedIntegration.lastSyncError ?? null
      },
      agents
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Constructor agent sync failed.";

    const updatedIntegration = await db.workspaceConstructorIntegration.update({
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
        eventType: "constructor.sync_failed",
        detail: message
      }
    });

    return {
      error: "CONSTRUCTOR_SYNC_FAILED",
      message,
      integration: updatedIntegration
    } as const;
  }
}