import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await resolveApiActor(request);

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  if (auth.actor.type !== "owner") {
    return error("Owner access required.", 403, { code: "OWNER_ACCESS_REQUIRED" });
  }

  return error("OpenClaw agent sync has been retired. Use /api/workspaces/current/constructor/sync.", 410, {
    code: "OPENCLAW_SYNC_RETIRED",
    replacement: "/api/workspaces/current/constructor/sync"
  });
}
