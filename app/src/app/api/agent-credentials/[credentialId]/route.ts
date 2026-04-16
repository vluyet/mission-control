import { error, ok } from "@/lib/api-response";
import { updateAgentCredentialInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

export async function PATCH(
  request: Request,
  { params }: { params: { credentialId: string } }
) {
  const t = await getApiT();
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error(t("api.ownerAccessRequired"), 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        enabled?: boolean;
      }
    | null;

  if (typeof body?.enabled !== "boolean") {
    return error(t("api.enabledFlagRequired"), 422, {
      code: "PATCH_REQUIRED"
    });
  }

  const credential = await updateAgentCredentialInDb(params.credentialId, body.enabled);

  if (!credential) {
    return error(t("api.credentialNotFound"), 404, {
      code: "CREDENTIAL_NOT_FOUND"
    });
  }

  return ok({
    credential
  });
}
