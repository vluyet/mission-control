import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const deleteRouteSource = path.join(appDir, "src/app/api/tasks/[taskId]/constructor/files/[fileId]/route.ts");
const downloadRouteSource = path.join(appDir, "src/app/api/tasks/[taskId]/constructor/files/[fileId]/download/route.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-task-file-download-route-tests");

async function writeSharedStubs() {
  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await fs.writeFile(
    path.join(outdir, "stubs", "api-response.mjs"),
    'export function ok(data, init = {}) { return new Response(JSON.stringify({ ok: true, data }), { status: init.status ?? 200, headers: { "content-type": "application/json" } }); }\n' +
      'export function error(message, status = 400, details) { return new Response(JSON.stringify({ ok: false, error: { message, details } }), { status, headers: { "content-type": "application/json" } }); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-auth.mjs"),
    'export async function resolveApiActor() { return { ok: true, actor: { type: "owner", label: "owner@example.com", scopes: ["*"] } }; }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-i18n.mjs"),
    'export function getApiT() { return (key) => ({\n' +
      '  "api.taskNotFound": "Task not found.",\n' +
      '  "api.constructorUnreachable": "Constructor is unreachable.",\n' +
      '  "api.constructorUnauthorized": "Constructor rejected Mission Control credentials.",\n' +
      '  "api.constructorFilesDisabled": "Constructor task files are disabled for this workspace.",\n' +
      '  "api.constructorFilesNotConfigured": "Constructor task files are not configured for this workspace yet.",\n' +
      '  "api.constructorFilesApiTokenRequired": "Constructor API token is required before task files can be managed.",\n' +
      '  "api.constructorFileDeleteFailed": "Constructor file removal failed.",\n' +
      '  "api.constructorFileNotFound": "Constructor file not found.",\n' +
      '  "api.constructorFileDownloadFailed": "Constructor file download failed."\n' +
      '}[key] ?? key); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor-task-runtime.mjs"),
    'export async function getTaskConstructorRuntime(taskId) {\n' +
      '  return globalThis.__taskConstructorRuntime ?? {\n' +
      '    kind: "ready",\n' +
      '    taskId,\n' +
      '    projectSlug: "proj",\n' +
      '    externalTaskId: `mc-task-${taskId}`,\n' +
      '    baseUrl: "http://127.0.0.1:9999",\n' +
      '    apiToken: "constructor-token"\n' +
      '  };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor.mjs"),
    'export async function deleteConstructorTaskFile(args) {\n' +
      '  (globalThis.__deleteFileCalls ??= []).push(args);\n' +
      '  return globalThis.__deleteFileResult ?? { response: new Response(JSON.stringify({ item: { id: args.fileId } }), { status: 200, headers: { "content-type": "application/json" } }), payload: { item: { id: args.fileId } }, item: { id: args.fileId, fileName: "brief.txt", kind: "input", active: false } };\n' +
      '}\n' +
      'export async function downloadConstructorTaskFile(args) {\n' +
      '  (globalThis.__downloadFileCalls ??= []).push(args);\n' +
      '  return globalThis.__downloadFileResult ?? { response: new Response("hello from constructor", { status: 200, headers: { "content-type": "text/plain", "content-length": "22", "content-disposition": "attachment; filename=\\"result.txt\\"" } }) };\n' +
      '}\n',
    "utf8"
  );
}

async function loadDeleteRouteModule() {
  const source = await fs.readFile(deleteRouteSource, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: deleteRouteSource
  }).outputText;

  const rewritten = transpiled
    .replace(/from "@\/lib\/api-response"/g, 'from "./stubs/api-response.mjs"')
    .replace(/from "@\/lib\/api-auth"/g, 'from "./stubs/api-auth.mjs"')
    .replace(/from "@\/lib\/api-i18n"/g, 'from "./stubs/api-i18n.mjs"')
    .replace(/from "@\/lib\/constructor"/g, 'from "./stubs/constructor.mjs"')
    .replace(/from "@\/lib\/server\/constructor-task-runtime"/g, 'from "./stubs/constructor-task-runtime.mjs"');

  await writeSharedStubs();
  await fs.writeFile(path.join(outdir, "delete-route.mjs"), rewritten, "utf8");

  return import(`${pathToFileURL(path.join(outdir, "delete-route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

async function loadDownloadRouteModule() {
  const source = await fs.readFile(downloadRouteSource, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: downloadRouteSource
  }).outputText;

  const rewritten = transpiled
    .replace(/from "@\/lib\/api-response"/g, 'from "./stubs/api-response.mjs"')
    .replace(/from "@\/lib\/api-auth"/g, 'from "./stubs/api-auth.mjs"')
    .replace(/from "@\/lib\/api-i18n"/g, 'from "./stubs/api-i18n.mjs"')
    .replace(/from "@\/lib\/constructor"/g, 'from "./stubs/constructor.mjs"')
    .replace(/from "@\/lib\/server\/constructor-task-runtime"/g, 'from "./stubs/constructor-task-runtime.mjs"');

  await writeSharedStubs();
  await fs.writeFile(path.join(outdir, "download-route.mjs"), rewritten, "utf8");

  return import(`${pathToFileURL(path.join(outdir, "download-route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__deleteFileCalls = [];
  globalThis.__downloadFileCalls = [];
  delete globalThis.__deleteFileResult;
  delete globalThis.__downloadFileResult;
  delete globalThis.__taskConstructorRuntime;
}

test("constructor task file delete route proxies removal through the stable task scope", async () => {
  resetGlobals();

  try {
    const { DELETE } = await loadDeleteRouteModule();
    const response = await DELETE(new Request("http://127.0.0.1:3000/api/tasks/task-7/constructor/files/file-7", { method: "DELETE" }), {
      params: { taskId: "task-7", fileId: "file-7" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.deleted, true);
    assert.equal(payload?.data?.fileId, "file-7");
    assert.equal(globalThis.__deleteFileCalls[0].externalTaskId, "mc-task-task-7");
  } finally {
    resetGlobals();
  }
});

test("constructor task file download route streams the upstream download response", async () => {
  resetGlobals();

  try {
    const { GET } = await loadDownloadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-8/constructor/files/file-8/download"), {
      params: { taskId: "task-8", fileId: "file-8" }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="result.txt"');
    assert.equal(await response.text(), "hello from constructor");
    assert.equal(globalThis.__downloadFileCalls[0].externalTaskId, "mc-task-task-8");
  } finally {
    resetGlobals();
  }
});