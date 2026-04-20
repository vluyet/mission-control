import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const routeSource = path.join(appDir, "src/app/api/tasks/[taskId]/route.ts");
const outdir = path.resolve("/tmp/mission-control-task-route-tests");

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
    .replace('from "next/cache"', 'from "./stubs/next-cache.mjs"')
    .replace('from "@/lib/api-response"', 'from "./stubs/api-response.mjs"')
    .replace('from "@/lib/server-data"', 'from "./stubs/server-data.mjs"')
    .replace('from "@/lib/logger"', 'from "./stubs/logger.mjs"')
    .replace('from "@/lib/api-auth"', 'from "./stubs/api-auth.mjs"')
    .replace('from "@/lib/api-i18n"', 'from "./stubs/api-i18n.mjs"');

  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await fs.writeFile(path.join(outdir, "route.mjs"), rewritten, "utf8");
  await fs.writeFile(
    path.join(outdir, "stubs", "next-cache.mjs"),
    'export function revalidatePath(value) { (globalThis.__revalidatedPaths ??= []).push(value); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-response.mjs"),
    'export function ok(data, init = {}) { return new Response(JSON.stringify({ ok: true, data }), { status: init.status ?? 200, headers: { "content-type": "application/json" } }); }\n' +
      'export function error(message, status = 400, details) { return new Response(JSON.stringify({ ok: false, error: { message, details } }), { status, headers: { "content-type": "application/json" } }); }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function getTaskResourceFromDb(taskId) {\n' +
      '  return globalThis.__taskResource ?? { task: { id: taskId, projectSlug: "launchpad" } };\n' +
      '}\n' +
      'export async function updateTaskInDb(taskId, body) {\n' +
      '  (globalThis.__taskUpdates ??= []).push({ taskId, body });\n' +
      '  return globalThis.__updateResult ?? { id: taskId, title: "Updated task" };\n' +
      '}\n' +
      'export async function deleteTaskInDb(taskId) {\n' +
      '  (globalThis.__taskDeletes ??= []).push(taskId);\n' +
      '  return globalThis.__deleteResult ?? { projectSlug: "launchpad" };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "logger.mjs"),
    'export function logAppEvent() {}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-auth.mjs"),
    'export async function resolveApiActor() { return { ok: true, actor: { type: "owner", label: "owner@example.com", scopes: ["*"] } }; }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "api-i18n.mjs"),
    'export async function getApiT() { return (key) => key; }\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__revalidatedPaths = [];
  globalThis.__taskUpdates = [];
  globalThis.__taskDeletes = [];
  delete globalThis.__taskResource;
  delete globalThis.__updateResult;
  delete globalThis.__deleteResult;
}

test("task PATCH route revalidates detail and list pages after updating status", async () => {
  resetGlobals();

  try {
    const { PATCH } = await loadRouteModule();
    const response = await PATCH(
      new Request("http://127.0.0.1:3000/api/tasks/task-321", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ status: "done", actorType: "human" })
      }),
      { params: { taskId: "task-321" } }
    );

    assert.equal(response.status, 200);
    assert.equal(globalThis.__taskUpdates.length, 1);
    assert.deepEqual(globalThis.__revalidatedPaths, [
      "/tasks/task-321",
      "/projects/launchpad/tasks/task-321",
      "/projects/launchpad",
      "/my-tasks",
      "/queue"
    ]);
  } finally {
    resetGlobals();
  }
});

test("task DELETE route revalidates detail and list pages after deletion", async () => {
  resetGlobals();

  try {
    const { DELETE } = await loadRouteModule();
    const response = await DELETE(
      new Request("http://127.0.0.1:3000/api/tasks/task-654", {
        method: "DELETE"
      }),
      { params: { taskId: "task-654" } }
    );

    assert.equal(response.status, 200);
    assert.equal(globalThis.__taskDeletes.length, 1);
    assert.deepEqual(globalThis.__revalidatedPaths, [
      "/tasks/task-654",
      "/projects/launchpad/tasks/task-654",
      "/projects/launchpad",
      "/my-tasks",
      "/queue"
    ]);
  } finally {
    resetGlobals();
  }
});