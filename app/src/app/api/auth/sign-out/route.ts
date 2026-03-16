import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getClearedSessionCookieOptions, verifySessionTokenDetailed } from "@/lib/auth";
import { ok } from "@/lib/api-response";
import { logAuthEvent } from "@/lib/api-auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionTokenDetailed(token);

  if (session.status === "valid") {
    await logAuthEvent({
      actorType: "owner",
      actorLabel: session.session.email,
      eventType: "owner.sign_out",
      detail: "Owner signed out"
    });
  }

  cookieStore.set(AUTH_COOKIE_NAME, "", getClearedSessionCookieOptions());

  return ok({
    signedOut: true
  });
}
