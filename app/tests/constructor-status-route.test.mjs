import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const routeSource = path.join(appDir, "src/app/api/tasks/[taskId]/constructor/status/route.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-status-tests");

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
    .replace('from "@/lib/api-response"', 'from "./stubs/api-response.mjs"')
    .replace('from "@/lib/api-auth"', 'from "./stubs/api-auth.mjs"')
    .replace('from "@/lib/constructor"', 'from "./stubs/constructor.mjs"')
    .replace('from "@/lib/db"', 'from "./stubs/db.mjs"')
    .replace('from "@/lib/server-data"', 'from "./stubs/server-data.mjs"');

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
    path.join(outdir, "stubs", "constructor.mjs"),
    'export async function fetchConstructorTaskSummary(args) {\n' +
      '  (globalThis.__constructorLookups ??= []).push(args);\n' +
      '  const payload = globalThis.__constructorSummaryPayload ?? { item: { bridgeExecutionId: "constructor:exec-1", externalTaskId: "mc-task-123", executionState: "running", callbackState: "pending", cancellationState: "none", runtimeName: "constructor", latestResult: null } };\n' +
      '  const status = globalThis.__constructorSummaryStatus ?? 200;\n' +
      '  return { response: new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }), payload };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "db.mjs"),
    'export const db = {\n' +
      '  task: {\n' +
      '    async findUnique() {\n' +
      '      return globalThis.__dbTask ?? {\n' +
      '        id: "task-123",\n' +
      '        status: "in_progress",\n' +
      '        blockedReason: null,\n' +
      '        project: { workspaceId: "ws-1" },\n' +
      '        executions: [\n' +
      '          {\n' +
      '            id: "exec-1",\n' +
      '            status: "running",\n' +
      '            summary: null,\n' +
      '            blockedReason: null,\n' +
      '            logs: (globalThis.__executionLogsForTask ?? []).map((line) => ({ line }))\n' +
      '          }\n' +
      '        ]\n' +
      '      };\n' +
      '    },\n' +
      '    async update(args) {\n' +
      '      (globalThis.__taskUpdates ??= []).push(args);\n' +
      '      return args;\n' +
      '    }\n' +
      '  },\n' +
      '  taskExecution: {\n' +
      '    async update(args) {\n' +
      '      (globalThis.__executionUpdates ??= []).push(args);\n' +
      '      return args;\n' +
      '    }\n' +
      '  },\n' +
      '  workspaceConstructorIntegration: {\n' +
      '    async findUnique() {\n' +
      '      return globalThis.__constructorIntegration ?? { workspaceId: "ws-1", baseUrl: "http://127.0.0.1:8787", apiToken: "constructor-token", enabled: true };\n' +
      '    }\n' +
      '  }\n' +
      '};\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function appendSystemExecutionLogInDb(taskId, line, label) {\n' +
      '  (globalThis.__systemExecutionLogs ??= []).push({ taskId, line, label });\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__constructorLookups = [];
  globalThis.__executionLogsForTask = [];
  globalThis.__systemExecutionLogs = [];
  globalThis.__taskUpdates = [];
  globalThis.__executionUpdates = [];
  delete globalThis.__constructorSummaryPayload;
  delete globalThis.__constructorSummaryStatus;
  delete globalThis.__constructorIntegration;
  delete globalThis.__dbTask;
}

test("constructor status route appends a progress log when Constructor advances execution state", async () => {
  resetGlobals();
  globalThis.__executionLogsForTask = [
    "CONSTRUCTOR_DISPATCH_ACCEPTED bridgeExecutionId=constructor:exec-1 externalTaskId=mc-task-123 executionState=queued"
  ];

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-123/constructor/status"), {
      params: { taskId: "task-123" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.tracked, true);
    assert.equal(payload?.data?.active, true);
    assert.equal(payload?.data?.refresh, true);
    assert.equal(globalThis.__constructorLookups.length, 1);
    assert.equal(globalThis.__constructorLookups[0].bridgeExecutionId, "constructor:exec-1");
    assert.equal(globalThis.__systemExecutionLogs.length, 1);
    assert.equal(
      globalThis.__systemExecutionLogs[0].line,
      "CONSTRUCTOR_STATUS bridgeExecutionId=constructor:exec-1 externalTaskId=mc-task-123 executionState=running callbackState=pending cancellationState=none runtimeName=constructor"
    );
    assert.equal(globalThis.__taskUpdates.length, 0);
    assert.equal(globalThis.__executionUpdates.length, 0);
  } finally {
    resetGlobals();
  }
});

test("constructor status route promotes completed executions into review", async () => {
  resetGlobals();
  globalThis.__executionLogsForTask = [
    "CONSTRUCTOR_STATUS bridgeExecutionId=constructor:exec-1 externalTaskId=mc-task-123 executionState=running callbackState=pending cancellationState=none runtimeName=constructor",
    "CONSTRUCTOR_DISPATCH_ACCEPTED bridgeExecutionId=constructor:exec-1 externalTaskId=mc-task-123 executionState=queued"
  ];
  globalThis.__constructorSummaryPayload = {
    item: {
      bridgeExecutionId: "constructor:exec-1",
      externalTaskId: "mc-task-123",
      executionState: "completed",
      callbackState: "delivered",
      cancellationState: "none",
      runtimeName: "constructor",
      latestResult: {
        type: "completed",
        text: "Final answer from Constructor"
      }
    }
  };

  try {
    const { GET } = await loadRouteModule();
    const response = await GET(new Request("http://127.0.0.1:3000/api/tasks/task-123/constructor/status"), {
      params: { taskId: "task-123" }
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.tracked, true);
    assert.equal(payload?.data?.active, false);
    assert.equal(payload?.data?.refresh, true);
    assert.equal(globalThis.__systemExecutionLogs.length, 1);
    assert.equal(globalThis.__executionUpdates.length, 1);
    assert.deepEqual(globalThis.__executionUpdates[0].data, {
      status: "done",
      summary: "Final answer from Constructor"
    });
    assert.equal(globalThis.__taskUpdates.length, 1);
    assert.deepEqual(globalThis.__taskUpdates[0].data, {
      status: "review",
      blockedReason: null
    });
  } finally {
    resetGlobals();
  }
});