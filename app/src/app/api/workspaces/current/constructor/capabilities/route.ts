import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
import { getActiveWorkspaceConstructorIntegrationRecord } from "@/lib/server-data";
import { getConstructorCapabilitiesSnapshot } from "@/lib/server/constructor-capabilities";

function getEmptyConstructorCapabilities() {
  return {
    taskFilesEnabled: null,
    uploadMaxBytes: null,
    uploadTransport: null,
    checkedAt: null
  };
}

export async function GET(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const integration = await getActiveWorkspaceConstructorIntegrationRecord();

  if (!integration) {
    return ok({
      constructor: {
        state: "not_configured",
        available: false,
        message: t("api.constructorFilesNotConfigured")
      },
      capabilities: getEmptyConstructorCapabilities()
    });
  }

  if (integration.enabled === false) {
    return ok({
      constructor: {
        state: "disabled",
        available: false,
        message: t("api.constructorFilesDisabled")
      },
      capabilities: getEmptyConstructorCapabilities()
    });
  }

  const baseUrl = integration.baseUrl.trim();

  if (!baseUrl) {
    return ok({
      constructor: {
        state: "not_configured",
        available: false,
        message: t("api.constructorFilesNotConfigured")
      },
      capabilities: getEmptyConstructorCapabilities()
    });
  }

  const apiToken = integration.apiToken?.trim() || process.env.CONSTRUCTOR_API_TOKEN?.trim() || null;

  if (!apiToken) {
    return ok({
      constructor: {
        state: "api_token_required",
        available: false,
        message: t("api.constructorFilesApiTokenRequired")
      },
      capabilities: getEmptyConstructorCapabilities()
    });
  }

  try {
    const snapshot = await getConstructorCapabilitiesSnapshot(
      {
        workspaceId: integration.workspaceId,
        baseUrl,
        apiToken
      },
      { forceRefresh: true }
    );

    return ok({
      constructor: {
        state: snapshot.capabilities.taskFiles.enabled ? "ready" : "task_files_disabled",
        available: snapshot.capabilities.taskFiles.enabled,
        message: snapshot.capabilities.taskFiles.enabled ? null : t("api.constructorTaskFilesCapabilityDisabled")
      },
      capabilities: {
        taskFilesEnabled: snapshot.capabilities.taskFiles.enabled,
        uploadMaxBytes: snapshot.capabilities.taskFiles.uploadMaxBytes,
        uploadTransport: snapshot.capabilities.taskFiles.uploadTransport,
        checkedAt: snapshot.fetchedAt
      }
    });
  } catch (capabilitiesError) {
    const status = typeof capabilitiesError === "object" && capabilitiesError !== null && "status" in capabilitiesError
      ? Number((capabilitiesError as { status?: unknown }).status)
      : null;

    if (status === 401 || status === 403) {
      return error(t("api.constructorUnauthorized"), 502, { code: "CONSTRUCTOR_UNAUTHORIZED" });
    }

    return error(t("api.constructorUnreachable"), 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: baseUrl
    });
  }
}