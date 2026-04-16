import { error } from "@/lib/api-response";
import { getApiT } from "@/lib/api-i18n";
import { getAttachmentPreviewFromDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { attachmentId: string } }
) {
  const t = await getApiT();
  const attachment = await getAttachmentPreviewFromDb(params.attachmentId);

  if (!attachment) {
    return error(t("api.attachmentNotFound"), 404, {
      attachmentId: params.attachmentId
    });
  }

  if ("error" in attachment) {
    return error(t("api.previewNotSupportedForFileType"), 422, {
      code: attachment.error
    });
  }

  return new Response(attachment.bytes, {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.sizeBytes),
      "Content-Disposition": `inline; filename="${attachment.originalName.replace(/"/g, "")}"`
    }
  });
}
