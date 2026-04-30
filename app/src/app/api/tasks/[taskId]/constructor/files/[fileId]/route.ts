import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
import { deleteConstructorTaskFile } from "@/lib/constructor";
import { getTaskConstructorRuntime } from "@/lib/server/constructor-task-runtime";

export const runtime = "nodejs";

function mapDeleteFailure(input: {
  response: Response;
  payload: { error?: string; message?: string } | null;
  t: Awaited<ReturnType<typeof getApiT>>;
}) {
  const detail = input.payload?.message ?? input.payload?.error ?? `${input.t("api.constructorFileDeleteFailed")} ${input.response.status}.`;

  if (input.response.status === 400 || input.response.status === 422) {
    return {
      status: 422,
      message: detail,
      details: {
        code: input.payload?.error ?? "CONSTRUCTOR_FILE_DELETE_REJECTED"
      }
    };
  }

  if (input.response.status === 404) {
    return {
      status: 404,
      message: detail,
      details: {
        code: input.payload?.error ?? "CONSTRUCTOR_FILE_NOT_FOUND"
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

  return {
    status: 502,
    message: detail,
    details: {
      code: input.payload?.error ?? "CONSTRUCTOR_FILE_DELETE_FAILED"
    }
  };
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string; fileId: string } }
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

  let result: Awaited<ReturnType<typeof deleteConstructorTaskFile>>;

  try {
    result = await deleteConstructorTaskFile({
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

  if (!result.response.ok) {
    const failure = mapDeleteFailure({
      response: result.response,
      payload: result.payload,
      t
    });

    return error(failure.message, failure.status, failure.details);
  }

  return ok({
    task_id: params.taskId,
    externalTaskId: runtimeState.externalTaskId,
    fileId: params.fileId,
    deleted: true,
    file: result.item ?? null
  });
}