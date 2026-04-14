import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, type AgentScope, hashAgentAccessToken, verifySessionTokenDetailed } from "@/lib/auth";
import { db } from "@/lib/db";

export type ApiActor =
  | {
      type: "owner";
      label: string;
      scopes: ["*"];
    }
  | {
      type: "agent";
      label: string;
      scopes: string[];
      membershipId: string;
      workspaceId: string;
      credentialId: string;
    };

export async function logAuthEvent(input: {
  workspaceId?: string | null;
  membershipId?: string | null;
  actorType: string;
  actorLabel: string;
  eventType: string;
  detail: string;
}) {
  await db.authEvent.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      membershipId: input.membershipId ?? null,
      actorType: input.actorType,
      actorLabel: input.actorLabel,
      eventType: input.eventType,
      detail: input.detail
    }
  });
}

export async function resolveApiActor(request: Request, requiredScope?: AgentScope) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionTokenDetailed(sessionToken);

  if (session.status === "valid") {
    return {
      ok: true as const,
      actor: {
        type: "owner" as const,
        label: session.session.email,
        scopes: ["*"] as ["*"]
      }
    };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false as const,
      status: session.status === "expired" ? 401 : 401,
      error: session.status === "expired" ? "SESSION_EXPIRED" : "UNAUTHENTICATED",
      message: session.status === "expired" ? "Session expired." : "Authentication required."
    };
  }

  const rawToken = authorization.slice("Bearer ".length).trim();
  const tokenHash = await hashAgentAccessToken(rawToken);
  const credential = await db.agentCredential.findUnique({
    where: { tokenHash },
    include: {
      membership: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!credential || !credential.enabled || !credential.membership.enabled || credential.membership.kind !== "agent") {
    return {
      ok: false as const,
      status: 401,
      error: "INVALID_AGENT_TOKEN",
      message: "Agent credential is invalid."
    };
  }

  if (requiredScope && !credential.scopes.includes(requiredScope)) {
    await logAuthEvent({
      workspaceId: credential.membership.workspaceId,
      membershipId: credential.membership.id,
      actorType: "agent",
      actorLabel: credential.membership.name,
      eventType: "agent.scope_denied",
      detail: `${credential.name} attempted ${requiredScope} without scope`
    });

    return {
      ok: false as const,
      status: 403,
      error: "AGENT_SCOPE_DENIED",
      message: "Agent credential does not have the required scope."
    };
  }

  await db.agentCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() }
  });

  await logAuthEvent({
    workspaceId: credential.membership.workspaceId,
    membershipId: credential.membership.id,
    actorType: "agent",
    actorLabel: credential.membership.name,
    eventType: "agent.credential_used",
    detail: `${credential.name} used agent API access`
  });

  return {
    ok: true as const,
    actor: {
      type: "agent" as const,
      label: credential.membership.name,
      scopes: credential.scopes,
      membershipId: credential.membership.id,
      workspaceId: credential.membership.workspaceId,
      credentialId: credential.id
    }
  };
}
