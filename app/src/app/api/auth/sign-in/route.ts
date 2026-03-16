import { cookies } from "next/headers";
import { createSessionToken, getOwnerAuthConfig, getSessionCookieOptions, AUTH_COOKIE_NAME } from "@/lib/auth";
import { error, ok } from "@/lib/api-response";
import { logAuthEvent } from "@/lib/api-auth";

type SignInBody = {
  email?: string;
  password?: string;
  remember?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignInBody | null;

  if (!body?.email || !body.password) {
    return error("Email and password are required.", 400, {
      code: "INVALID_CREDENTIALS"
    });
  }

  const auth = getOwnerAuthConfig();
  const normalizedEmail = body.email.trim().toLowerCase();

  if (normalizedEmail !== auth.email.toLowerCase() || body.password !== auth.password) {
    return error("The email or password is incorrect.", 401, {
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
    detail: remember ? "Owner signed in with remember-device enabled" : "Owner signed in"
  });

  return ok({
    session: {
      email: auth.email,
      remember
    }
  });
}
