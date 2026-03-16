export const AUTH_COOKIE_NAME = "mission_control_session";
export const AGENT_BEARER_PREFIX = "mc_agent_";
export const AGENT_SCOPES = [
  "tasks.read",
  "tasks.write",
  "comments.read",
  "comments.write",
  "activity.read",
  "execution.read",
  "execution.write",
  "attachments.read",
  "attachments.write",
  "projects.read",
  "workspaces.read",
  "search.read"
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

const DEV_OWNER_EMAIL = "owner@northstar.lab";
const DEV_OWNER_PASSWORD = "mission-control-local";
const DEV_AUTH_SECRET = "mission-control-local-secret";

type SessionPayload = {
  email: string;
  exp: number;
};

export type SessionVerificationResult =
  | { status: "valid"; session: SessionPayload }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "missing" };

function getOwnerEmail() {
  return process.env.OWNER_EMAIL || DEV_OWNER_EMAIL;
}

function getOwnerPassword() {
  return process.env.OWNER_PASSWORD || DEV_OWNER_PASSWORD;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || DEV_AUTH_SECRET;
}

function toBase64Url(input: string) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signValue(value: string) {
  const key = await importSigningKey();
  const buffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digestValue(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getOwnerAuthConfig() {
  return {
    email: getOwnerEmail(),
    password: getOwnerPassword()
  };
}

export async function createSessionToken(email: string, remember = false) {
  const expiresAt = Date.now() + (remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24);
  const payload = toBase64Url(JSON.stringify({ email, exp: expiresAt } satisfies SessionPayload));
  const signature = await signValue(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  const result = await verifySessionTokenDetailed(token);
  return result.status === "valid" ? result.session : null;
}

export async function verifySessionTokenDetailed(token?: string | null): Promise<SessionVerificationResult> {
  if (!token) {
    return { status: "missing" };
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return { status: "invalid" };
  }

  const expected = await signValue(payload);

  if (expected !== signature) {
    return { status: "invalid" };
  }

  const parsed = JSON.parse(fromBase64Url(payload)) as SessionPayload;

  if (parsed.exp < Date.now()) {
    return { status: "expired" };
  }

  if (parsed.email !== getOwnerEmail()) {
    return { status: "invalid" };
  }

  return { status: "valid", session: parsed };
}

export function getSessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24
  };
}

export function getClearedSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(false),
    maxAge: 0
  };
}

export async function createAgentAccessToken() {
  const seed = `${crypto.randomUUID()}-${Date.now()}-${crypto.randomUUID()}`;
  return `${AGENT_BEARER_PREFIX}${toBase64Url(seed)}`;
}

export async function hashAgentAccessToken(token: string) {
  return digestValue(`${getAuthSecret()}:${token}`);
}
