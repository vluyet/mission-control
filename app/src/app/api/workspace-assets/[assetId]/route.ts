import { error } from "@/lib/api-response";
import { getApiT } from "@/lib/api-i18n";
import { getWorkspaceAssetDownloadFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { assetId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "workspaces.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const asset = await getWorkspaceAssetDownloadFromDb(params.assetId);

  if (!asset) {
    return error(t("api.workspaceAssetNotFound"), 404, {
      assetId: params.assetId
    });
  }

  return new Response(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.sizeBytes),
      "Content-Disposition": `attachment; filename="${asset.originalName.replace(/"/g, "")}"`
    }
  });
}
