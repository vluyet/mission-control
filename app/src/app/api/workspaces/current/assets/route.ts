import { error, ok } from "@/lib/api-response";
import { createWorkspaceAssetInDb, getWorkspaceAssetsFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "workspaces.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const assets = await getWorkspaceAssetsFromDb();

  if (!assets) {
    return error(t("api.workspaceNotFound"), 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok({
    assets
  });
}

export async function POST(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "attachments.write");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const assetType = typeof formData?.get("assetType") === "string" ? String(formData?.get("assetType")) : "reference";

  if (!(file instanceof File) || !file.size) {
    return error(t("api.fileRequired"), 422, {
      code: "FILE_REQUIRED"
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const asset = await createWorkspaceAssetInDb({
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    bytes,
    assetType
  });

  if (!asset) {
    return error(t("api.workspaceNotFound"), 404, {
      code: "WORKSPACE_NOT_FOUND"
    });
  }

  return ok(
    {
      asset
    },
    { status: 201 }
  );
}
