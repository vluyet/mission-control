import { error, ok } from "@/lib/api-response";
import { getWorkspaceManagementDataForUi, updateWorkspaceOpenClawIntegrationInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const payload = await getWorkspaceManagementDataForUi();

  if (!payload) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    openclaw: payload.workspace.openclawIntegration,
    agents: payload.workspace.agents.filter((agent) => agent.sourceSystem === "openclaw")
  });
}

export async function PATCH(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, {
      code: "OWNER_ACCESS_REQUIRED"
    });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        label?: string;
        dashboardUrl?: string;
        enabled?: boolean;
        discoveryMode?: "cli" | "config_file";
        executable?: string;
        arguments?: string[];
        configPath?: string;
      }
    | null;

  if (!body) {
    return error("OpenClaw integration payload is required.", 422, {
      code: "OPENCLAW_CONFIG_REQUIRED"
    });
  }

  if (body.discoveryMode === "cli" && !body.executable?.trim()) {
    return error("CLI executable is required for CLI discovery.", 422, {
      code: "OPENCLAW_EXECUTABLE_REQUIRED"
    });
  }

  if (body.discoveryMode === "config_file" && !body.configPath?.trim()) {
    return error("Config path is required for config file discovery.", 422, {
      code: "OPENCLAW_CONFIG_PATH_REQUIRED"
    });
  }

  const integration = await updateWorkspaceOpenClawIntegrationInDb({
    label: body.label,
    dashboardUrl: body.dashboardUrl,
    enabled: body.enabled,
    discoveryMode: body.discoveryMode,
    executable: body.executable,
    arguments: body.arguments,
    configPath: body.configPath
  });

  if (!integration) {
    return error("Workspace not found.", 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    integration
  });
}
