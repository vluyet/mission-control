import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
import { fetchConstructorTaskFiles, type ConstructorTaskFile, uploadConstructorTaskFile } from "@/lib/constructor";
import {
  getConstructorCapabilitiesSnapshot,
  peekConstructorCapabilitiesSnapshot,
  type ConstructorCapabilitiesSnapshot
} from "@/lib/server/constructor-capabilities";
import { getTaskConstructorRuntime } from "@/lib/server/constructor-task-runtime";

export const runtime = "nodejs";

function sortFilesByNewest(items: ConstructorTaskFile[]) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? "") || 0;
    const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? "") || 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.fileName.localeCompare(right.fileName);
  });
}

function splitTaskFiles(items: ConstructorTaskFile[]) {
  return {
    inputs: sortFilesByNewest(items.filter((item) => item.kind === "input" && item.active)),
    outputs: sortFilesByNewest(items.filter((item) => item.kind === "output"))
  };
}

function getEmptyConstructorCapabilities() {
  return {
    taskFilesEnabled: null,
    uploadMaxBytes: null,
    uploadTransport: null,
    checkedAt: null
  };
}

function serializeConstructorCapabilities(snapshot: ConstructorCapabilitiesSnapshot | null) {
  if (!snapshot) {
    return getEmptyConstructorCapabilities();
  }

  return {
    taskFilesEnabled: snapshot.capabilities.taskFiles.enabled,
    uploadMaxBytes: snapshot.capabilities.taskFiles.uploadMaxBytes,
    uploadTransport: snapshot.capabilities.taskFiles.uploadTransport,
    checkedAt: snapshot.fetchedAt
  };
}

function getConstructorAvailabilityState(kind: "disabled" | "not_configured" | "api_token_required", t: Awaited<ReturnType<typeof getApiT>>) {
  switch (kind) {
    case "disabled":
      return {
        state: "disabled" as const,
        available: false,
        message: t("api.constructorFilesDisabled")
      };
    case "not_configured":
      return {
        state: "not_configured" as const,
        available: false,
        message: t("api.constructorFilesNotConfigured")
      };
    default:
      return {
        state: "api_token_required" as const,
        available: false,
        message: t("api.constructorFilesApiTokenRequired")
      };
  }
}

function mapConstructorCapabilitiesFailure(input: {
  error: unknown;
  t: Awaited<ReturnType<typeof getApiT>>;
  baseUrl: string;
}) {
  const status = typeof input.error === "object" && input.error !== null && "status" in input.error
    ? Number((input.error as { status?: unknown }).status)
    : null;

  if (status === 401 || status === 403) {
    return error(input.t("api.constructorUnauthorized"), 502, {
      code: "CONSTRUCTOR_UNAUTHORIZED"
    });
  }

  return error(input.t("api.constructorUnreachable"), 502, {
    code: "CONSTRUCTOR_UNREACHABLE",
    constructorBaseUrl: input.baseUrl
  });
}

function mapFileProxyFailure(input: {
  response: Response;
  payload: { error?: string; message?: string } | null;
  t: Awaited<ReturnType<typeof getApiT>>;
  action: "list" | "upload";
}) {
  const fallback =
    input.action === "upload"
      ? input.t("api.constructorFileUploadFailed")
      : input.t("api.constructorFilesListFailed");
  const detail = input.payload?.message ?? input.payload?.error ?? `${fallback} ${input.response.status}.`;

  if (input.response.status === 400 || input.response.status === 422) {
    return {
      status: 422,
      message: detail,
      details: {
        code: input.payload?.error ?? "CONSTRUCTOR_FILE_VALIDATION_FAILED"
      }
    };
  }

  if (input.response.status === 413) {
    return {
      status: 413,
      message: input.payload?.message ?? input.t("api.constructorFileTooLarge"),
      details: {
        code: input.payload?.error ?? "CONSTRUCTOR_TASK_FILE_TOO_LARGE"
      }
    };
  }

  if (input.response.status === 401 || input.response.status === 403) {
    return {
      status: 502,
      message: input.t("api.constructorUnauthorized"),
      details: {
        code: "CONSTRUCTOR_UNAUTHORIZED"
      }
    };
  }

  if (input.response.status === 404) {
    return {
      status: 404,
      message: detail,
      details: {
        code: input.payload?.error ?? "CONSTRUCTOR_TASK_SCOPE_NOT_FOUND"
      }
    };
  }

  return {
    status: 502,
    message: detail,
    details: {
      code: input.payload?.error ?? "CONSTRUCTOR_FILE_PROXY_FAILED"
    }
  };
}

async function resolveUploadedFileFromCanonicalList(input: {
  baseUrl: string;
  apiToken: string;
  externalTaskId: string;
  fileName: string;
}) {
  try {
    const result = await fetchConstructorTaskFiles({
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      externalTaskId: input.externalTaskId
    });

    if (!result.response.ok) {
      return null;
    }

    const normalizedFileName = input.fileName.trim().toLowerCase();

    return (
      sortFilesByNewest(result.items.filter((item) => item.kind === "input" && item.active)).find(
        (item) => item.fileName.trim().toLowerCase() === normalizedFileName
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "attachments.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const runtimeState = await getTaskConstructorRuntime(params.taskId);

  if (runtimeState.kind === "missing_task") {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  if (runtimeState.kind !== "ready") {
    return ok({
      task_id: params.taskId,
      constructor: {
        ...getConstructorAvailabilityState(runtimeState.kind, t),
        externalTaskId: runtimeState.externalTaskId,
        capabilities: getEmptyConstructorCapabilities()
      },
      files: {
        inputs: [],
        outputs: []
      }
    });
  }

  let capabilitiesSnapshot: ConstructorCapabilitiesSnapshot;

  try {
    capabilitiesSnapshot = await getConstructorCapabilitiesSnapshot({
      workspaceId: runtimeState.workspaceId,
      baseUrl: runtimeState.baseUrl,
      apiToken: runtimeState.apiToken
    });
  } catch (capabilitiesError) {
    return mapConstructorCapabilitiesFailure({
      error: capabilitiesError,
      t,
      baseUrl: runtimeState.baseUrl
    });
  }

  const constructorCapabilities = serializeConstructorCapabilities(capabilitiesSnapshot);

  if (constructorCapabilities.taskFilesEnabled === false) {
    return ok({
      task_id: params.taskId,
      constructor: {
        state: "task_files_disabled",
        available: false,
        externalTaskId: runtimeState.externalTaskId,
        message: t("api.constructorTaskFilesCapabilityDisabled"),
        capabilities: constructorCapabilities
      },
      files: {
        inputs: [],
        outputs: []
      }
    });
  }

  let result: Awaited<ReturnType<typeof fetchConstructorTaskFiles>>;

  try {
    result = await fetchConstructorTaskFiles({
      baseUrl: runtimeState.baseUrl,
      apiToken: runtimeState.apiToken,
      externalTaskId: runtimeState.externalTaskId
    });
  } catch {
    return error(t("api.constructorUnreachable"), 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: runtimeState.baseUrl
    });
  }

  if (!result.response.ok) {
    const failure = mapFileProxyFailure({
      response: result.response,
      payload: result.payload,
      t,
      action: "list"
    });

    return error(failure.message, failure.status, failure.details);
  }

  return ok({
    task_id: params.taskId,
    constructor: {
      state: "ready",
      available: true,
      externalTaskId: runtimeState.externalTaskId,
      message: null,
      capabilities: constructorCapabilities
    },
    files: splitTaskFiles(result.items)
  });
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "attachments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const runtimeState = await getTaskConstructorRuntime(params.taskId);

  if (runtimeState.kind === "missing_task") {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  if (runtimeState.kind === "disabled") {
    return error(t("api.constructorFilesDisabled"), 409, { code: "CONSTRUCTOR_DISABLED" });
  }

  if (runtimeState.kind === "not_configured") {
    return error(t("api.constructorFilesNotConfigured"), 409, { code: "CONSTRUCTOR_NOT_CONFIGURED" });
  }

  if (runtimeState.kind === "api_token_required") {
    return error(t("api.constructorFilesApiTokenRequired"), 409, { code: "CONSTRUCTOR_API_TOKEN_REQUIRED" });
  }

  const cachedCapabilities = peekConstructorCapabilitiesSnapshot({
    workspaceId: runtimeState.workspaceId,
    baseUrl: runtimeState.baseUrl,
    apiToken: runtimeState.apiToken
  });

  if (cachedCapabilities?.capabilities.taskFiles.enabled === false) {
    return error(t("api.constructorTaskFilesCapabilityDisabled"), 409, {
      code: "CONSTRUCTOR_TASK_FILES_DISABLED"
    });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        fileName?: string;
        contentBase64?: string;
        contentType?: string;
      }
    | null;

  const fileName = body?.fileName?.trim() ?? "";
  const contentBase64 = body?.contentBase64?.trim() ?? "";

  if (!fileName) {
    return error(t("api.constructorFileNameRequired"), 422, { code: "CONSTRUCTOR_FILE_NAME_REQUIRED" });
  }

  if (!contentBase64) {
    return error(t("api.constructorFileContentRequired"), 422, { code: "CONSTRUCTOR_FILE_CONTENT_REQUIRED" });
  }

  try {
    Buffer.from(contentBase64, "base64");
  } catch {
    return error(t("api.constructorFileContentInvalid"), 422, { code: "CONSTRUCTOR_FILE_CONTENT_INVALID" });
  }

  let result: Awaited<ReturnType<typeof uploadConstructorTaskFile>>;

  try {
    result = await uploadConstructorTaskFile({
      baseUrl: runtimeState.baseUrl,
      apiToken: runtimeState.apiToken,
      externalTaskId: runtimeState.externalTaskId,
      body: {
        fileName,
        contentBase64,
        ...(body?.contentType?.trim() ? { contentType: body.contentType.trim() } : {})
      }
    });
  } catch {
    return error(t("api.constructorUnreachable"), 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: runtimeState.baseUrl
    });
  }

  if (!result.response.ok) {
    const failure = mapFileProxyFailure({
      response: result.response,
      payload: result.payload,
      t,
      action: "upload"
    });

    return error(failure.message, failure.status, failure.details);
  }

  const uploadedFile =
    result.item ??
    (await resolveUploadedFileFromCanonicalList({
      baseUrl: runtimeState.baseUrl,
      apiToken: runtimeState.apiToken,
      externalTaskId: runtimeState.externalTaskId,
      fileName
    }));
  const deduplicated = result.response.status === 200 || result.payload?.deduplicated === true;

  return ok(
    {
      task_id: params.taskId,
      externalTaskId: runtimeState.externalTaskId,
      deduplicated,
      file: uploadedFile
    },
    { status: deduplicated ? 200 : 201 }
  );
}