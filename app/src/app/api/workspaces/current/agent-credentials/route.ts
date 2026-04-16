import { error, ok } from "@/lib/api-response";
import { AGENT_SCOPES, type AgentScope } from "@/lib/auth";
import { createAgentCredentialInDb, getWorkspaceManagementDataForUi } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function GET(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const payload = await getWorkspaceManagementDataForUi();

  if (!payload) {
    return error(t("api.workspaceNotFound"), 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    credentials: payload.workspace.agentCredentials,
    availableScopes: AGENT_SCOPES
  });
}

export async function POST(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        membershipId?: string;
        name?: string;
        scopes?: AgentScope[];
      }
    | null;

  if (!body?.membershipId || !body?.name?.trim() || !Array.isArray(body.scopes) || !body.scopes.length) {
    return error(t("api.agentNameAndScopesRequired"), 422, {
      code: "INVALID_CREDENTIAL_REQUEST"
    });
  }

  const safeScopes = body.scopes.filter((scope): scope is AgentScope =>
    (AGENT_SCOPES as readonly string[]).includes(scope)
  );

  if (!safeScopes.length) {
    return error(t("api.atLeastOneValidScopeRequired"), 422, {
      code: "INVALID_CREDENTIAL_SCOPES"
    });
  }

  const result = await createAgentCredentialInDb({
    membershipId: body.membershipId,
    name: body.name,
    scopes: safeScopes
  });

  if (!result) {
    return error(t("api.workspaceNotFound"), 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  if ("error" in result) {
    return error(t("api.agentMemberNotFound"), 404, {
      code: result.error
    });
  }

  return ok(
    {
      credential: result.credential,
      token: result.token
    },
    { status: 201 }
  );
}
