import { error } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
import { downloadConstructorTaskFile } from "@/lib/constructor";
import { getTaskConstructorRuntime } from "@/lib/server/constructor-task-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string; fileId: string } }
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

  if (runtimeState.kind === "disabled") {
    return error(t("api.constructorFilesDisabled"), 409, { code: "CONSTRUCTOR_DISABLED" });
  }

  if (runtimeState.kind === "not_configured") {
    return error(t("api.constructorFilesNotConfigured"), 409, { code: "CONSTRUCTOR_NOT_CONFIGURED" });
  }

  if (runtimeState.kind === "api_token_required") {
    return error(t("api.constructorFilesApiTokenRequired"), 409, { code: "CONSTRUCTOR_API_TOKEN_REQUIRED" });
  }

  let result: Awaited<ReturnType<typeof downloadConstructorTaskFile>>;

  try {
    result = await downloadConstructorTaskFile({
      baseUrl: runtimeState.baseUrl,
      apiToken: runtimeState.apiToken,
      externalTaskId: runtimeState.externalTaskId,
      fileId: params.fileId
    });
  } catch {
    return error(t("api.constructorUnreachable"), 502, {
      code: "CONSTRUCTOR_UNREACHABLE",
      constructorBaseUrl: runtimeState.baseUrl
    });
  }

  if (result.response.status === 404) {
    return error(t("api.constructorFileNotFound"), 404, { code: "CONSTRUCTOR_FILE_NOT_FOUND", fileId: params.fileId });
  }

  if (result.response.status === 401 || result.response.status === 403) {
    return error(t("api.constructorUnauthorized"), 502, { code: "CONSTRUCTOR_UNAUTHORIZED" });
  }

  if (!result.response.ok) {
    return error(t("api.constructorFileDownloadFailed"), 502, {
      code: "CONSTRUCTOR_FILE_DOWNLOAD_FAILED"
    });
  }

  const headers = new Headers();

  for (const [key, value] of result.response.headers.entries()) {
    if (["content-type", "content-length", "content-disposition", "cache-control", "etag", "last-modified"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  if (!headers.has("content-disposition")) {
    headers.set("content-disposition", `attachment; filename="${params.fileId.replace(/"/g, "")}"`);
  }

  return new Response(result.response.body, {
    status: 200,
    headers
  });
}