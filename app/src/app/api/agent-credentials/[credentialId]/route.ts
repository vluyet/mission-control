import { error, ok } from "@/lib/api-response";
import { updateAgentCredentialInDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { credentialId: string } }
) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        enabled?: boolean;
      }
    | null;

  if (typeof body?.enabled !== "boolean") {
    return error("Enabled flag is required.", 422, {
      code: "PATCH_REQUIRED"
    });
  }

  const credential = await updateAgentCredentialInDb(params.credentialId, body.enabled);

  if (!credential) {
    return error("Credential not found.", 404, {
      code: "CREDENTIAL_NOT_FOUND"
    });
  }

  return ok({
    credential
  });
}
