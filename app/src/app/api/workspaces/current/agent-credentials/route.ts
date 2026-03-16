import { error, ok } from "@/lib/api-response";
import { AGENT_SCOPES, type AgentScope } from "@/lib/auth";
import { createAgentCredentialInDb, getWorkspaceManagementDataForUi } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const payload = await getWorkspaceManagementDataForUi();

  if (!payload) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    credentials: payload.workspace.agentCredentials,
    availableScopes: AGENT_SCOPES
  });
}

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        membershipId?: string;
        name?: string;
        scopes?: AgentScope[];
      }
    | null;

  if (!body?.membershipId || !body?.name?.trim() || !Array.isArray(body.scopes) || !body.scopes.length) {
    return error("Agent, name, and scopes are required.", 422, {
      code: "INVALID_CREDENTIAL_REQUEST"
    });
  }

  const safeScopes = body.scopes.filter((scope): scope is AgentScope =>
    (AGENT_SCOPES as readonly string[]).includes(scope)
  );

  if (!safeScopes.length) {
    return error("At least one valid scope is required.", 422, {
      code: "INVALID_CREDENTIAL_SCOPES"
    });
  }

  const result = await createAgentCredentialInDb({
    membershipId: body.membershipId,
    name: body.name,
    scopes: safeScopes
  });

  if (!result) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  if ("error" in result) {
    return error("Agent member not found.", 404, {
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
