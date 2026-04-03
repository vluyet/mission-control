import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "/opt/mission-control/app/node_modules/typescript/lib/typescript.js";
import { pathToFileURL } from "node:url";

const routeSource = path.resolve("/opt/mission-control/app/src/app/api/tasks/[taskId]/constructor/dispatch/route.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-dispatch-tests");

async function loadRouteModule() {
  const source = await fs.readFile(routeSource, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: routeSource
  }).outputText;

  const rewritten = transpiled
    .replace('from "next/cache"', 'from "./stubs/next-cache.mjs"')
    .replace('from "@/lib/api-response"', 'from "./stubs/api-response.mjs"')
    .replace('from "@/lib/api-auth"', 'from "./stubs/api-auth.mjs"')
    .replace('from "@/lib/server-data"', 'from "./stubs/server-data.mjs"');

  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await fs.writeFile(path.join(outdir, "route.mjs"), rewritten, "utf8");
  await fs.writeFile(
    path.join(outdir, "stubs", "next-cache.mjs"),
    'export function revalidatePath() {}\n',
    "utf8"
  );
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
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function getTaskResourceFromDb(taskId) {\n' +
      '  return {\n' +
      '    task: {\n' +
      '      id: taskId,\n' +
      '      title: "Constructor dispatch task",\n' +
      '      description: "Dispatch route contract verification.",\n' +
      '      status: "todo",\n' +
      '      priority: "high",\n' +
      '      assignee: null,\n' +
      '      project: "Dispatch Project",\n' +
      '      projectSlug: "dispatch-project",\n' +
      '      due: null\n' +
      '    },\n' +
      '    comments: [\n' +
      '      { author: "Workspace Owner", role: "Owner", body: "Please keep the response concise." },\n' +
      '      { author: "Research Agent", role: "Agent", body: "Key facts are already in the task context." }\n' +
      '    ]\n' +
      '  };\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}`);
}

test("constructor dispatch route sends Mission Control contract envelope", async () => {
  const previousConstructorBaseUrl = process.env.CONSTRUCTOR_BASE_URL;
  const previousMissionControlBaseUrl = process.env.MISSION_CONTROL_BASE_URL;
  const requests = [];
  const originalFetch = globalThis.fetch;

  process.env.CONSTRUCTOR_BASE_URL = "http://127.0.0.1:9898";
  process.env.MISSION_CONTROL_BASE_URL = "http://127.0.0.1:3000";

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url, init });
    return new Response(
      JSON.stringify({
        accepted: true,
        bridgeExecutionId: "constructor:test-exec-1",
        externalTaskId: "mc-task-test-1",
        executionState: "queued",
        message: "execution accepted and queued"
      }),
      {
        status: 202,
        headers: { "content-type": "application/json" }
      }
    );
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-123/constructor/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: "Return a concise final answer only." })
      }),
      { params: { taskId: "task-123" } }
    );

    assert.equal(response.status, 202);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.dispatch?.accepted, true);
    assert.equal(payload?.data?.dispatch?.bridgeExecutionId, "constructor:test-exec-1");
    assert.equal(payload?.data?.dispatch?.externalTaskId, "mc-task-test-1");
    assert.equal(payload?.data?.dispatch?.executionState, "queued");

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "http://127.0.0.1:9898/source/mission-control/events");
    assert.equal(requests[0].init.method, "POST");
    assert.equal(requests[0].init.headers["content-type"], "application/json");

    const envelope = JSON.parse(requests[0].init.body);
    assert.equal(envelope.version, "v1");
    assert.equal(envelope.source, "mission-control");
    assert.equal(envelope.eventType, "task.execute");
    assert.equal(typeof envelope.eventId, "string");
    assert.equal(typeof envelope.idempotencyKey, "string");
    assert.equal(typeof envelope.traceId, "string");
    assert.equal(typeof envelope.occurredAt, "string");
    assert.equal(envelope.payload.externalTaskId.startsWith("mc-task-task-123-"), true);
    assert.equal(envelope.payload.targetAgent, "main");
    assert.equal(envelope.payload.instruction, "Return a concise final answer only.");
    assert.equal(envelope.payload.context.missionControl.taskId, "task-123");
    assert.equal(envelope.payload.context.missionControl.title, "Constructor dispatch task");
    assert.equal(envelope.payload.context.constructor.mode, "mission-control-dispatch");
    assert.equal(envelope.payload.metadata.origin, "mission-control-ui");
    assert.equal(envelope.payload.metadata.integration, "constructor");
    assert.equal(envelope.payload.callback.required, true);
    assert.equal(
      envelope.payload.callback.url,
      "http://127.0.0.1:3000/api/tasks/task-123/constructor/callback"
    );
    assert.equal(envelope.payload.retryPolicy.maxDispatchAttempts, 5);
    assert.equal(envelope.payload.retryPolicy.maxCallbackAttempts, 5);
    assert.equal(envelope.payload.timeoutPolicy.executionTimeoutMs, 300000);
    assert.equal(envelope.payload.timeoutPolicy.dispatchTimeoutMs, 30000);
    assert.equal(envelope.payload.timeoutPolicy.callbackTimeoutMs, 10000);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousConstructorBaseUrl === undefined) delete process.env.CONSTRUCTOR_BASE_URL;
    else process.env.CONSTRUCTOR_BASE_URL = previousConstructorBaseUrl;
    if (previousMissionControlBaseUrl === undefined) delete process.env.MISSION_CONTROL_BASE_URL;
    else process.env.MISSION_CONTROL_BASE_URL = previousMissionControlBaseUrl;
  }
});
