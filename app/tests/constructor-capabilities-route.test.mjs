import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const routeSource = path.join(appDir, "src/app/api/workspaces/current/constructor/capabilities/route.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-capabilities-route-tests");

async function loadRouteModule() {
  const source = await fs.readFile(routeSource, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: routeSource
  }).outputText;

  const rewritten = transpiled
    .replace(/from "@\/lib\/api-response"/g, 'from "./stubs/api-response.mjs"')
    .replace(/from "@\/lib\/api-auth"/g, 'from "./stubs/api-auth.mjs"')
    .replace(/from "@\/lib\/api-i18n"/g, 'from "./stubs/api-i18n.mjs"')
    .replace(/from "@\/lib\/server-data"/g, 'from "./stubs/server-data.mjs"')
    .replace(/from "@\/lib\/server\/constructor-capabilities"/g, 'from "./stubs/constructor-capabilities.mjs"');

  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await fs.writeFile(path.join(outdir, "route.mjs"), rewritten, "utf8");
  await fs.writeFile(
    path.join(outdir, "stubs", "api-response.mjs"),
    'export function ok(data, init = {}) { return new Response(JSON.stringify({ ok: true, data }), { status: init.status ?? 200, headers: { "content-type": "application/json" } }); }\n' +
      'export function error(message, status = 400, details) { return new Response(JSON.stringify({ ok: false, error: { message, details } }), { status, headers: { "content-type": "application/json" } }); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-auth.mjs"),
    'export async function resolveApiActor() { return { ok: true, actor: { type: "owner", label: "owner@example.com" } }; }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-i18n.mjs"),
    'export function getApiT() { return (key) => ({\n' +
      '  "api.ownerAccessRequired": "Owner access required.",\n' +
      '  "api.constructorFilesDisabled": "Constructor task files are disabled for this workspace.",\n' +
      '  "api.constructorFilesNotConfigured": "Constructor task files are not configured for this workspace yet.",\n' +
      '  "api.constructorFilesApiTokenRequired": "Constructor API token is required before task files can be managed.",\n' +
      '  "api.constructorTaskFilesCapabilityDisabled": "Task-file uploads are not enabled on this Constructor instance.",\n' +
      '  "api.constructorUnauthorized": "Constructor rejected Mission Control credentials.",\n' +
      '  "api.constructorUnreachable": "Constructor is unreachable."\n' +
      '}[key] ?? key); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function getActiveWorkspaceConstructorIntegrationRecord() {\n' +
      '  return globalThis.__integrationRecord ?? { workspaceId: "workspace-1", baseUrl: "http://127.0.0.1:9999", apiToken: "ctor-token", enabled: true };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor-capabilities.mjs"),
    'export async function getConstructorCapabilitiesSnapshot(args, options) {\n' +
      '  (globalThis.__capabilityCalls ??= []).push({ args, options });\n' +
      '  if (globalThis.__capabilityError) {\n' +
      '    throw globalThis.__capabilityError;\n' +
      '  }\n' +
      '  return globalThis.__capabilityResult ?? { capabilities: { taskFiles: { enabled: true, uploadMaxBytes: 12582912, uploadTransport: "json_base64" } }, fetchedAt: "2026-04-30T12:00:00.000Z", source: "live" };\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__capabilityCalls = [];
  delete globalThis.__capabilityResult;
  delete globalThis.__capabilityError;
  delete globalThis.__integrationRecord;
}

test("constructor capabilities route returns the current upload limit", async () => {
  resetGlobals();

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/workspaces/current/constructor/capabilities"));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.constructor?.state, "ready");
    assert.equal(payload?.data?.capabilities?.uploadMaxBytes, 12582912);
    assert.equal(payload?.data?.capabilities?.uploadTransport, "json_base64");
    assert.equal(globalThis.__capabilityCalls[0]?.args?.workspaceId, "workspace-1");
    assert.equal(globalThis.__capabilityCalls[0]?.options?.forceRefresh, true);
  } finally {
    resetGlobals();
  }
});

test("constructor capabilities route returns disabled state without fetching when the integration is disabled", async () => {
  resetGlobals();
  globalThis.__integrationRecord = {
    workspaceId: "workspace-1",
    baseUrl: "http://127.0.0.1:9999",
    apiToken: "ctor-token",
    enabled: false
  };

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/workspaces/current/constructor/capabilities"));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.constructor?.state, "disabled");
    assert.equal(payload?.data?.capabilities?.uploadMaxBytes, null);
    assert.equal(globalThis.__capabilityCalls.length, 0);
  } finally {
    resetGlobals();
  }
});