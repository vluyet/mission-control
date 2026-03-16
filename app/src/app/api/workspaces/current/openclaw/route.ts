import { error, ok } from "@/lib/api-response";
import { getActiveWorkspaceOpenClawIntegration, upsertActiveWorkspaceOpenClawIntegrationInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const integration = await getActiveWorkspaceOpenClawIntegration();
  return ok({ integration });
}

export async function PATCH(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as
    | { label?: string; baseUrl?: string; gatewayToken?: string; enabled?: boolean }
    | null;

  if (!body?.baseUrl?.trim()) {
    return error("OpenClaw base URL is required.", 422, { code: "OPENCLAW_BASE_URL_REQUIRED" });
  }

  const result = await upsertActiveWorkspaceOpenClawIntegrationInDb({
    label: body.label,
    baseUrl: body.baseUrl,
    gatewayToken: body.gatewayToken,
    enabled: body.enabled
  });

  if (!result) {
    return error("Workspace not found.", 404, { code: "WORKSPACE_NOT_FOUND" });
  }

  if ("error" in result) {
    return error("OpenClaw gateway token is required.", 422, { code: result.error });
  }

  return ok({ integration: result });
}
