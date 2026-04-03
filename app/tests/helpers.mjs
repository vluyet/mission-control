import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

function readLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const result = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    result[key] = value;
  }
  return result;
}

const localEnv = readLocalEnv();

export async function signIn() {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.MC_OWNER_EMAIL || process.env.OWNER_EMAIL || localEnv.OWNER_EMAIL || "owner@northstar.lab",
      password:
        process.env.MC_OWNER_PASSWORD ||
        process.env.OWNER_PASSWORD ||
        localEnv.OWNER_PASSWORD ||
        "mission-control-local"
    }),
    redirect: "manual"
  });

  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "expected auth cookie");
  return cookie;
}

export async function upsertWorkspaceConstructorIntegration(cookie, body) {
  const response = await fetch(`${baseUrl}/api/workspaces/current/constructor`, {
    method: "PATCH",
    headers: {
      ...(cookie ? { cookie } : {}),
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
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
