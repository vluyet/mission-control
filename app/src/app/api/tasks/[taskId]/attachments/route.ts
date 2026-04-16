import { error, ok } from "@/lib/api-response";
import { createAttachmentInDb, getTaskAttachmentsFromDb, getTaskResourceFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "attachments.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  return ok({
    task_id: params.taskId,
    attachments: await getTaskAttachmentsFromDb(params.taskId)
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

  const task = await getTaskResourceFromDb(params.taskId);

  if (!task) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const artifactType = typeof formData?.get("artifactType") === "string" ? String(formData?.get("artifactType")) : "reference";
  const actorType =
    auth.actor.type === "agent"
      ? "agent"
      : typeof formData?.get("actorType") === "string" && String(formData?.get("actorType")) === "agent"
        ? "agent"
        : "human";

  if (!(file instanceof File) || !file.size) {
    return error(t("api.fileRequired"), 422, {
      code: "FILE_REQUIRED"
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const attachment = await createAttachmentInDb(params.taskId, {
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    bytes,
    artifactType,
    actorName: auth.actor.label,
    actorType,
    membershipId: auth.actor.type === "agent" ? auth.actor.membershipId : undefined
  });

  if (!attachment) {
    return error(t("api.taskNotFound"), 404, { taskId: params.taskId });
  }

  if ("error" in attachment) {
    return error(t("api.agentUploadNotAllowed"), 422, {
      code: attachment.error
    });
  }

  return ok(
    {
      task_id: params.taskId,
      attachment
    },
    { status: 201 }
  );
}
