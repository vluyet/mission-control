import { error } from "@/lib/api-response";
import { getWorkspaceAssetPreviewFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { assetId: string } }
) {
  const auth = await resolveApiActor(request, "workspaces.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const asset = await getWorkspaceAssetPreviewFromDb(params.assetId);

  if (!asset) {
    return error("Workspace asset not found", 404, {
      assetId: params.assetId
    });
  }

  if ("error" in asset) {
    return error("Preview is not supported for this file type.", 422, {
      code: asset.error
    });
  }

  return new Response(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.sizeBytes),
      "Content-Disposition": `inline; filename="${asset.originalName.replace(/"/g, "")}"`
    }
  });
}
