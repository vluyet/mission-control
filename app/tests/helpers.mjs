import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const defaultBaseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
export const baseUrl = defaultBaseUrl;
const allowLiveMutation = process.env.MC_ALLOW_LIVE_TEST_MUTATIONS === "1";

function assertSafeMutationTarget() {
  if (allowLiveMutation) {
    return;
  }

  if (baseUrl === "http://127.0.0.1:3000" || baseUrl === "http://localhost:3000") {
    throw new Error(
      `Refusing to run mutating tests against live Mission Control at ${baseUrl}. ` +
        "Set TEST_BASE_URL to an isolated instance or set MC_ALLOW_LIVE_TEST_MUTATIONS=1 to override intentionally."
    );
  }
}

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

export function cookiePair(setCookieHeader) {
  return setCookieHeader?.split(";")[0] ?? null;
}

export function combineCookies(...cookies) {
  const pairs = cookies
    .flatMap((cookie) => (cookie ? cookie.split(/;\s*/) : []))
    .filter(Boolean);

  const byName = new Map();
  for (const pair of pairs) {
    byName.set(pair.split("=")[0], pair);
  }

  return Array.from(byName.values()).join("; ");
}

export async function getCurrentWorkspaceSlug(cookie) {
  const workspace = await json("/api/workspaces/current", { cookie });
  assert.equal(workspace.response.status, 200);
  const slug = workspace.payload?.data?.workspace?.slug;
  assert.ok(slug, "expected current workspace slug");
  return slug;
}

export async function createTemporaryWorkspaceSession(cookie, namePrefix) {
  const sourceSlug = await getCurrentWorkspaceSlug(cookie);
  const workspaceCreate = await json("/api/workspaces", {
    method: "POST",
    cookie,
    body: {
      name: `${namePrefix} ${Date.now()}`,
      visibility: "personal"
    }
  });

  assert.equal(workspaceCreate.response.status, 201);
  const workspaceSlug = workspaceCreate.payload?.data?.workspace?.slug;
  assert.ok(workspaceSlug, "expected temporary workspace slug");
  const workspaceCookie = cookiePair(workspaceCreate.response.headers.get("set-cookie"));
  assert.ok(workspaceCookie, "expected workspace cookie after workspace create");

  return {
    sourceSlug,
    workspaceSlug,
    cookie: combineCookies(cookie, workspaceCookie)
  };
}

export async function activateWorkspaceSession(cookie, slug) {
  const switchResponse = await json("/api/workspaces/active", {
    method: "POST",
    cookie,
    body: { slug }
  });

  assert.equal(switchResponse.response.status, 200);
  const workspaceCookie = cookiePair(switchResponse.response.headers.get("set-cookie"));
  assert.ok(workspaceCookie, "expected workspace cookie after workspace switch");

  return {
    response: switchResponse.response,
    payload: switchResponse.payload,
    cookie: combineCookies(cookie, workspaceCookie)
  };
}

export async function deleteWorkspace(cookie, slug) {
  return json(`/api/workspaces/${slug}`, {
    method: "DELETE",
    cookie
  });
}

export async function cleanupTemporaryWorkspaceSession(cookie, session) {
  await activateWorkspaceSession(cookie, session.sourceSlug);

  const workspaceDelete = await deleteWorkspace(cookie, session.workspaceSlug);
  assert.equal(workspaceDelete.response.status, 200);
}

export async function upsertWorkspaceConstructorIntegration(cookie, body) {
  assertSafeMutationTarget();
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
  if (method !== "GET" && method !== "HEAD") {
    assertSafeMutationTarget();
  }
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
