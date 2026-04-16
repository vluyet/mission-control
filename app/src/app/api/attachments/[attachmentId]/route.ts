import { error } from "@/lib/api-response";
import { getApiT } from "@/lib/api-i18n";
import { getAttachmentDownloadFromDb } from "@/lib/server-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { attachmentId: string } }
) {
  const t = await getApiT();
  const attachment = await getAttachmentDownloadFromDb(params.attachmentId);

  if (!attachment) {
    return error(t("api.attachmentNotFound"), 404, {
      attachmentId: params.attachmentId
    });
  }

  return new Response(attachment.bytes, {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.sizeBytes),
      "Content-Disposition": `attachment; filename="${attachment.originalName.replace(/"/g, "")}"`
    }
  });
}
