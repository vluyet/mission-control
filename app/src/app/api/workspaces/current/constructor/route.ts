import { error, ok } from "@/lib/api-response";
import {
  getActiveWorkspaceConstructorIntegration,
  upsertActiveWorkspaceConstructorIntegrationInDb
} from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const integration = await getActiveWorkspaceConstructorIntegration();
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
    | { label?: string; baseUrl?: string; callbackToken?: string; enabled?: boolean }
    | null;

  if (!body?.baseUrl?.trim()) {
    return error("Constructor base URL is required.", 422, { code: "CONSTRUCTOR_BASE_URL_REQUIRED" });
  }

  const result = await upsertActiveWorkspaceConstructorIntegrationInDb({
    label: body.label,
    baseUrl: body.baseUrl,
    callbackToken: body.callbackToken,
    enabled: body.enabled
  });

  if (!result) {
    return error("Workspace not found.", 404, { code: "WORKSPACE_NOT_FOUND" });
  }

  return ok({ integration: result });
}
