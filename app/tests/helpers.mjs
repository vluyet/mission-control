import assert from "node:assert/strict";

export const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

export async function signIn() {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.OWNER_EMAIL || "owner@northstar.lab",
      password: process.env.OWNER_PASSWORD || "mission-control-local"
    }),
    redirect: "manual"
  });

  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "expected auth cookie");
  return cookie;
}

export async function json(path, { method = "GET", cookie, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}
