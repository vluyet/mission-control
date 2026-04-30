import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const routeSource = path.join(appDir, "src/app/api/tasks/[taskId]/constructor/files/route.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-task-files-route-tests");

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
    .replace(/from "@\/lib\/constructor"/g, 'from "./stubs/constructor.mjs"')
    .replace(/from "@\/lib\/server\/constructor-capabilities"/g, 'from "./stubs/constructor-capabilities.mjs"')
    .replace(/from "@\/lib\/server\/constructor-task-runtime"/g, 'from "./stubs/constructor-task-runtime.mjs"');

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
      '  "api.constructorTaskFilesCapabilityDisabled": "Task-file uploads are not enabled on this Constructor instance.",\n' +
      '  "api.constructorFilesListFailed": "Constructor file listing failed.",\n' +
      '  "api.constructorFileTooLarge": "The selected file exceeds the current Constructor upload limit.",\n' +
      '  "api.constructorFileUploadFailed": "Constructor file upload failed.",\n' +
      '  "api.constructorFileNameRequired": "File name is required.",\n' +
      '  "api.constructorFileContentRequired": "File content is required.",\n' +
      '  "api.constructorFileContentInvalid": "File content must be valid base64."\n' +
      '}[key] ?? key); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor-capabilities.mjs"),
    'export function peekConstructorCapabilitiesSnapshot(args) {\n' +
      '  (globalThis.__peekCapabilitiesCalls ??= []).push(args);\n' +
      '  return globalThis.__peekCapabilitiesResult ?? null;\n' +
      '}\n' +
      'export async function getConstructorCapabilitiesSnapshot(args) {\n' +
      '  (globalThis.__getCapabilitiesCalls ??= []).push(args);\n' +
      '  if (globalThis.__getCapabilitiesError) {\n' +
      '    throw globalThis.__getCapabilitiesError;\n' +
      '  }\n' +
      '  return globalThis.__getCapabilitiesResult ?? { capabilities: { taskFiles: { enabled: true, uploadMaxBytes: 12582912, uploadTransport: "json_base64" } }, fetchedAt: "2026-04-30T12:00:00.000Z", source: "cache" };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor-task-runtime.mjs"),
    'export async function getTaskConstructorRuntime(taskId) {\n' +
      '  return globalThis.__taskConstructorRuntime ?? {\n' +
      '    kind: "ready",\n' +
      '    taskId,\n' +
      '    workspaceId: "workspace-1",\n' +
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
    'export async function fetchConstructorTaskFiles(args) {\n' +
      '  (globalThis.__fetchFilesCalls ??= []).push(args);\n' +
      '  return globalThis.__fetchFilesResult ?? { response: new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "content-type": "application/json" } }), payload: { items: [] }, items: [] };\n' +
      '}\n' +
      'export async function uploadConstructorTaskFile(args) {\n' +
      '  (globalThis.__uploadFileCalls ??= []).push(args);\n' +
      '  return globalThis.__uploadFileResult ?? { response: new Response(JSON.stringify({ item: { id: "file-1", fileName: args.body.fileName, kind: "input", active: true } }), { status: 201, headers: { "content-type": "application/json" } }), payload: { item: { id: "file-1" } }, item: { id: "file-1", fileName: args.body.fileName, kind: "input", active: true } };\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__fetchFilesCalls = [];
  globalThis.__uploadFileCalls = [];
  globalThis.__getCapabilitiesCalls = [];
  globalThis.__peekCapabilitiesCalls = [];
  delete globalThis.__fetchFilesResult;
  delete globalThis.__uploadFileResult;
  delete globalThis.__getCapabilitiesResult;
  delete globalThis.__peekCapabilitiesResult;
  delete globalThis.__getCapabilitiesError;
  delete globalThis.__taskConstructorRuntime;
}

test("constructor task files route returns active inputs and outputs separately", async () => {
  resetGlobals();
  globalThis.__fetchFilesResult = {
    response: new Response(JSON.stringify({ items: [{ id: "input-1" }] }), { status: 200, headers: { "content-type": "application/json" } }),
    payload: { items: [{ id: "input-1" }] },
    items: [
      { id: "input-1", fileName: "brief.txt", kind: "input", active: true, mediaType: "text/plain", sizeBytes: 42, createdAt: "2026-04-28T10:00:00.000Z", updatedAt: "2026-04-28T10:00:00.000Z", creatorExecutionId: null },
      { id: "input-2", fileName: "old.txt", kind: "input", active: false, mediaType: "text/plain", sizeBytes: 21, createdAt: "2026-04-27T10:00:00.000Z", updatedAt: "2026-04-27T10:00:00.000Z", creatorExecutionId: null },
      { id: "output-1", fileName: "result.md", kind: "output", active: true, mediaType: "text/markdown", sizeBytes: 88, createdAt: "2026-04-28T12:00:00.000Z", updatedAt: "2026-04-28T12:00:00.000Z", creatorExecutionId: "exec-9" }
    ]
  };

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-1/constructor/files"), {
      params: { taskId: "task-1" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.constructor?.available, true);
    assert.equal(payload?.data?.constructor?.externalTaskId, "mc-task-task-1");
    assert.equal(payload?.data?.constructor?.capabilities?.uploadMaxBytes, 12582912);
    assert.equal(payload?.data?.files?.inputs.length, 1);
    assert.equal(payload?.data?.files?.inputs[0].id, "input-1");
    assert.equal(payload?.data?.files?.outputs.length, 1);
    assert.equal(payload?.data?.files?.outputs[0].id, "output-1");
    assert.equal(globalThis.__getCapabilitiesCalls[0].workspaceId, "workspace-1");
    assert.equal(globalThis.__fetchFilesCalls[0].externalTaskId, "mc-task-task-1");
  } finally {
    resetGlobals();
  }
});

test("constructor task files route returns a task-files-disabled state when capabilities disable uploads", async () => {
  resetGlobals();
  globalThis.__getCapabilitiesResult = {
    capabilities: {
      taskFiles: {
        enabled: false,
        uploadMaxBytes: 5242880,
        uploadTransport: "json_base64"
      }
    },
    fetchedAt: "2026-04-30T12:00:00.000Z",
    source: "cache"
  };

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-5/constructor/files"), {
      params: { taskId: "task-5" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.constructor?.state, "task_files_disabled");
    assert.equal(payload?.data?.constructor?.available, false);
    assert.equal(payload?.data?.constructor?.capabilities?.uploadMaxBytes, 5242880);
    assert.equal(globalThis.__fetchFilesCalls.length, 0);
  } finally {
    resetGlobals();
  }
});

test("constructor task files route returns a disabled availability state without calling Constructor", async () => {
  resetGlobals();
  globalThis.__taskConstructorRuntime = {
    kind: "disabled",
    taskId: "task-2",
    projectSlug: "proj",
    externalTaskId: "mc-task-task-2"
  };

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-2/constructor/files"), {
      params: { taskId: "task-2" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.constructor?.state, "disabled");
    assert.equal(payload?.data?.files?.inputs.length, 0);
    assert.equal(globalThis.__fetchFilesCalls.length, 0);
  } finally {
    resetGlobals();
  }
});

test("constructor task files route returns a deduplicated upload as 200", async () => {
  resetGlobals();
  globalThis.__uploadFileResult = {
    response: new Response(JSON.stringify({ item: { id: "file-2" }, deduplicated: true }), { status: 200, headers: { "content-type": "application/json" } }),
    payload: { item: { id: "file-2" }, deduplicated: true },
    item: { id: "file-2", fileName: "brief.txt", kind: "input", active: true, mediaType: "text/plain", sizeBytes: 12, createdAt: "2026-04-28T11:00:00.000Z", updatedAt: "2026-04-28T11:00:00.000Z", creatorExecutionId: null }
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-3/constructor/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "brief.txt",
          contentBase64: Buffer.from("brief").toString("base64"),
          contentType: "text/plain"
        })
      }),
      { params: { taskId: "task-3" } }
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.deduplicated, true);
    assert.equal(payload?.data?.file?.id, "file-2");
    assert.equal(globalThis.__uploadFileCalls[0].externalTaskId, "mc-task-task-3");
  } finally {
    resetGlobals();
  }
});

test("constructor task files route recovers uploaded file metadata from the canonical list when the upload response omits it", async () => {
  resetGlobals();
  globalThis.__uploadFileResult = {
    response: new Response(JSON.stringify({ deduplicated: true }), { status: 200, headers: { "content-type": "application/json" } }),
    payload: { deduplicated: true },
    item: null
  };
  globalThis.__fetchFilesResult = {
    response: new Response(JSON.stringify({ items: [{ id: "file-3" }] }), { status: 200, headers: { "content-type": "application/json" } }),
    payload: { items: [{ id: "file-3" }] },
    items: [
      {
        id: "file-3",
        fileName: "brief.txt",
        kind: "input",
        active: true,
        mediaType: "text/plain",
        sizeBytes: 12,
        createdAt: "2026-04-28T11:00:00.000Z",
        updatedAt: "2026-04-28T11:00:00.000Z",
        creatorExecutionId: null
      }
    ]
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-3/constructor/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "brief.txt",
          contentBase64: Buffer.from("brief").toString("base64"),
          contentType: "text/plain"
        })
      }),
      { params: { taskId: "task-3" } }
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.deduplicated, true);
    assert.equal(payload?.data?.file?.id, "file-3");
    assert.equal(globalThis.__uploadFileCalls[0].externalTaskId, "mc-task-task-3");
    assert.equal(globalThis.__fetchFilesCalls[0].externalTaskId, "mc-task-task-3");
  } finally {
    resetGlobals();
  }
});

test("constructor task files route validates missing file names before calling Constructor", async () => {
  resetGlobals();

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-4/constructor/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentBase64: Buffer.from("brief").toString("base64") })
      }),
      { params: { taskId: "task-4" } }
    );

    assert.equal(response.status, 422);
    const payload = await response.json();
    assert.equal(payload?.ok, false);
    assert.equal(payload?.error?.details?.code, "CONSTRUCTOR_FILE_NAME_REQUIRED");
    assert.equal(globalThis.__uploadFileCalls.length, 0);
  } finally {
    resetGlobals();
  }
});

test("constructor task files route maps upstream 413 upload failures cleanly", async () => {
  resetGlobals();
  globalThis.__uploadFileResult = {
    response: new Response(JSON.stringify({ error: "task_file_too_large", message: "Too large for Constructor." }), {
      status: 413,
      headers: { "content-type": "application/json" }
    }),
    payload: { error: "task_file_too_large", message: "Too large for Constructor." },
    item: null
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-6/constructor/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "big.pdf",
          contentBase64: Buffer.from("brief").toString("base64"),
          contentType: "application/pdf"
        })
      }),
      { params: { taskId: "task-6" } }
    );

    assert.equal(response.status, 413);
    const payload = await response.json();
    assert.equal(payload?.ok, false);
    assert.equal(payload?.error?.message, "Too large for Constructor.");
    assert.equal(payload?.error?.details?.code, "task_file_too_large");
  } finally {
    resetGlobals();
  }
});