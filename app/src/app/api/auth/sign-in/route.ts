import { cookies } from "next/headers";
import { createSessionToken, getOwnerAuthConfig, getSessionCookieOptions, AUTH_COOKIE_NAME } from "@/lib/auth";
import { error, ok } from "@/lib/api-response";
import { logAuthEvent } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";

type SignInBody = {
  email?: string;
  password?: string;
  remember?: boolean;
};

export async function POST(request: Request) {
  const t = await getApiT();
  const body = (await request.json().catch(() => null)) as SignInBody | null;

  if (!body?.email || !body.password) {
    return error(t("auth.missingCredentials"), 400, {
      code: "INVALID_CREDENTIALS"
    });
  }

  const auth = getOwnerAuthConfig();
  const normalizedEmail = body.email.trim().toLowerCase();

  if (normalizedEmail !== auth.email.toLowerCase() || body.password !== auth.password) {
    return error(t("auth.invalidCredentials"), 401, {
      code: "INVALID_CREDENTIALS"
    });
  }

  const remember = Boolean(body.remember);
  const token = await createSessionToken(auth.email, remember);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions(remember));
  await logAuthEvent({
    actorType: "owner",
    actorLabel: auth.email,
    eventType: "owner.sign_in",
    detail: remember ? t("authAudit.ownerSignedInRemember") : t("authAudit.ownerSignedIn")
  });

  return ok({
    session: {
      email: auth.email,
      remember
    }
  });
}
