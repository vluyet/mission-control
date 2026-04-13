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
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: routeSource
  }).outputText;

  const rewritten = transpiled
    .replace('from "next/cache"', 'from "./stubs/next-cache.mjs"')
    .replace('from "@/lib/api-response"', 'from "./stubs/api-response.mjs"')
    .replace('from "@/lib/api-auth"', 'from "./stubs/api-auth.mjs"')
    .replace('from "@/lib/constructor"', 'from "./stubs/constructor.mjs"')
    .replace('from "@/lib/db"', 'from "./stubs/db.mjs"')
    .replace('from "@/lib/server-data"', 'from "./stubs/server-data.mjs"');

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
    path.join(outdir, "stubs", "api-auth.mjs"),
    'export async function resolveApiActor() { return { ok: true, actor: { type: "owner", label: "owner@example.com", scopes: ["*"] } }; }\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor.mjs"),
    'export async function dispatchConstructorTask(args) {\n' +
      '  (globalThis.__dispatchCalls ??= []).push(args);\n' +
      '  const payload = globalThis.__dispatchPayload ?? { accepted: true, bridgeExecutionId: "constructor:test-exec-1", externalTaskId: "mc-task-test-1", executionState: "queued", message: "execution accepted and queued" };\n' +
      '  const status = globalThis.__dispatchStatus ?? 202;\n' +
      '  return { response: new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } }), payload };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "db.mjs"),
    'export const db = {\n' +
      '  task: {\n' +
      '    async findUnique({ where }) {\n' +
      '      return globalThis.__dbTask ?? {\n' +
      '        id: where.id,\n' +
      '        project: { workspaceId: "ws-1", slug: "dispatch-project" },\n' +
      '        assignee: null\n' +
      '      };\n' +
      '    },\n' +
      '    async update(args) {\n' +
      '      (globalThis.__taskUpdates ??= []).push(args);\n' +
      '      return args;\n' +
      '    }\n' +
      '  },\n' +
      '  membership: {\n' +
      '    async findFirst() {\n' +
      '      return globalThis.__defaultAgent ?? { name: "Default Constructor", sourceKey: "constructor-default" };\n' +
      '    }\n' +
      '  }\n' +
      '};\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function getActiveWorkspaceConstructorIntegrationRecord() {\n' +
      '  return globalThis.__constructorIntegration ?? null;\n' +
      '}\n' +
      'export async function getTaskResourceFromDb(taskId) {\n' +
      '  return globalThis.__taskResource ?? {\n' +
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
      '}\n' +
      'export async function appendSystemExecutionLogInDb(taskId, line, label) {\n' +
      '  (globalThis.__executionLogs ??= []).push({ taskId, line, label });\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__dispatchCalls = [];
  globalThis.__taskUpdates = [];
  globalThis.__executionLogs = [];
  globalThis.__revalidatedPaths = [];
  delete globalThis.__dispatchPayload;
  delete globalThis.__dispatchStatus;
  delete globalThis.__defaultAgent;
  delete globalThis.__dbTask;
  delete globalThis.__taskResource;
  delete globalThis.__constructorIntegration;
}

test("constructor dispatch route submits a public API task request with a server-authored instruction", async () => {
  const previousMissionControlBaseUrl = process.env.MISSION_CONTROL_BASE_URL;

  resetGlobals();
  process.env.MISSION_CONTROL_BASE_URL = "http://127.0.0.1:3000";
  globalThis.__constructorIntegration = {
    id: "ctor-1",
    label: "Primary Constructor",
    baseUrl: "http://127.0.0.1:9999",
    apiToken: "constructor-public-token",
    enabled: true
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-123/constructor/dispatch", { method: "POST" }),
      { params: { taskId: "task-123" } }
    );

    assert.equal(response.status, 202);

    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.dispatch?.accepted, true);
    assert.equal(payload?.data?.dispatch?.bridgeExecutionId, "constructor:test-exec-1");
    assert.equal(payload?.data?.dispatch?.externalTaskId, "mc-task-test-1");
    assert.equal(payload?.data?.dispatch?.executionState, "queued");
    assert.equal(payload?.data?.dispatch?.targetAgent, "constructor-default");
    assert.equal(payload?.data?.dispatch?.targetSource, "default");

    assert.equal(globalThis.__dispatchCalls.length, 1);
    const dispatchCall = globalThis.__dispatchCalls[0];
    assert.equal(dispatchCall.baseUrl, "http://127.0.0.1:9999");
    assert.equal(dispatchCall.apiToken, "constructor-public-token");
    assert.equal(dispatchCall.body.externalTaskId.startsWith("mc-task-task-123-"), true);
    assert.equal(dispatchCall.body.idempotencyKey.startsWith("mc-task-task-123-"), true);
    assert.equal(dispatchCall.body.targetAgent, "constructor-default");
    assert.match(dispatchCall.body.instruction, /Requested deliverable:/);
    assert.match(dispatchCall.body.instruction, /Dispatch route contract verification\./);
    assert.match(dispatchCall.body.instruction, /Task title: Constructor dispatch task/);
    assert.match(dispatchCall.body.instruction, /Response requirements:/);
    assert.equal(dispatchCall.body.context.missionControl.taskId, "task-123");
    assert.equal(dispatchCall.body.context.missionControl.title, "Constructor dispatch task");
    assert.equal(dispatchCall.body.context.constructor.mode, "mission-control-dispatch");
    assert.equal(dispatchCall.body.metadata.origin, "mission-control-ui");
    assert.equal(dispatchCall.body.metadata.integration, "constructor");
    assert.equal(dispatchCall.body.callback.required, true);
    assert.equal(
      dispatchCall.body.callback.url,
      "http://127.0.0.1:3000/api/tasks/task-123/constructor/callback"
    );
    assert.equal(dispatchCall.body.retryPolicy.maxDispatchAttempts, 5);
    assert.equal(dispatchCall.body.retryPolicy.maxCallbackAttempts, 5);
    assert.equal(dispatchCall.body.timeoutPolicy.executionTimeoutMs, 300000);
    assert.equal(dispatchCall.body.timeoutPolicy.dispatchTimeoutMs, 30000);
    assert.equal(dispatchCall.body.timeoutPolicy.callbackTimeoutMs, 10000);

    assert.equal(globalThis.__taskUpdates.length, 1);
    assert.equal(globalThis.__taskUpdates[0].where.id, "task-123");
    assert.equal(globalThis.__taskUpdates[0].data.status, "in_progress");
    assert.equal(globalThis.__executionLogs.some((entry) => entry.line.includes("CONSTRUCTOR_DISPATCH_ACCEPTED")), true);
    assert.equal(globalThis.__revalidatedPaths.includes("/tasks/task-123"), true);
  } finally {
    resetGlobals();
    if (previousMissionControlBaseUrl === undefined) {
      delete process.env.MISSION_CONTROL_BASE_URL;
    } else {
      process.env.MISSION_CONTROL_BASE_URL = previousMissionControlBaseUrl;
    }
  }
});

test("constructor dispatch route builds a task-first default instruction when no override is provided", async () => {
  const previousMissionControlBaseUrl = process.env.MISSION_CONTROL_BASE_URL;

  resetGlobals();
  process.env.MISSION_CONTROL_BASE_URL = "http://127.0.0.1:3000";
  globalThis.__constructorIntegration = {
    id: "ctor-1",
    label: "Primary Constructor",
    baseUrl: "http://127.0.0.1:9999",
    apiToken: "constructor-public-token",
    enabled: true
  };
  globalThis.__taskResource = {
    task: {
      id: "task-789",
      title: "Prepare release checklist",
      description: "Compile the missing launch checklist for the next release candidate.",
      status: "review",
      priority: "high",
      assignee: "Echo",
      project: "Dispatch Project",
      projectSlug: "dispatch-project",
      due: null,
      tags: ["Release", "Checklist"],
      blockedReason: null,
      contextHint: "Focus on release blocking items first.",
      parentTaskId: null,
      parentTaskTitle: null,
      reviewer: null,
      startDate: null
    },
    comments: [
      { author: "Workspace Owner", role: "Owner", body: "We need the actual checklist, not just a status note." }
    ],
    child_tasks: [
      { id: "PROJET-T-002", title: "Collect regression risks", status: "Todo" }
    ],
    attachments: [
      { name: "release-notes.md", artifactType: "reference", author: "Workspace Owner", uploadedAt: "1m ago" }
    ],
    resolved_context: {
      layers: {
        workspace: { summary: "Shared release workspace", bullets: ["Keep release notes aligned"] },
        project: { summary: "Projet test rollout", bullets: ["Target staging first"] },
        task: { hint: "Confirm the blocking checks explicitly." }
      }
    }
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-789/constructor/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
      { params: { taskId: "task-789" } }
    );

    assert.equal(response.status, 202);
    assert.equal(globalThis.__dispatchCalls.length, 1);

    const dispatchCall = globalThis.__dispatchCalls[0];
    assert.match(dispatchCall.body.instruction, /Requested deliverable:/);
    assert.match(dispatchCall.body.instruction, /Compile the missing launch checklist/);
    assert.match(dispatchCall.body.instruction, /Task title: Prepare release checklist/);
    assert.ok(
      dispatchCall.body.instruction.indexOf("Requested deliverable:\nCompile the missing launch checklist for the next release candidate.") <
        dispatchCall.body.instruction.indexOf("Task title: Prepare release checklist")
    );
    assert.match(dispatchCall.body.instruction, /Return the actual deliverable or answer requested above\./);
    assert.match(dispatchCall.body.instruction, /Do not reply with a generic acknowledgement like "Done"/);
    assert.equal(dispatchCall.body.context.missionControl.description, "Compile the missing launch checklist for the next release candidate.");
    assert.deepEqual(dispatchCall.body.context.missionControl.tags, ["Release", "Checklist"]);
    assert.equal(dispatchCall.body.context.missionControl.recentComments[0].body, "We need the actual checklist, not just a status note.");
  } finally {
    resetGlobals();
    if (previousMissionControlBaseUrl === undefined) {
      delete process.env.MISSION_CONTROL_BASE_URL;
    } else {
      process.env.MISSION_CONTROL_BASE_URL = previousMissionControlBaseUrl;
    }
  }
});

test("constructor dispatch route rejects underspecified tasks before calling Constructor", async () => {
  const previousMissionControlBaseUrl = process.env.MISSION_CONTROL_BASE_URL;

  resetGlobals();
  process.env.MISSION_CONTROL_BASE_URL = "http://127.0.0.1:3000";
  globalThis.__constructorIntegration = {
    id: "ctor-1",
    label: "Primary Constructor",
    baseUrl: "http://127.0.0.1:9999",
    apiToken: "constructor-public-token",
    enabled: true
  };
  globalThis.__taskResource = {
    task: {
      id: "task-guard",
      title: "Browser guardrail check",
      description: "TBD",
      status: "todo",
      priority: "medium",
      assignee: null,
      project: "Dispatch Project",
      projectSlug: "dispatch-project",
      due: null,
      tags: [],
      blockedReason: null,
      contextHint: null,
      parentTaskId: null,
      parentTaskTitle: null,
      reviewer: null,
      startDate: null
    },
    comments: [],
    child_tasks: [],
    attachments: [],
    resolved_context: null
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-guard/constructor/dispatch", { method: "POST" }),
      { params: { taskId: "task-guard" } }
    );

    assert.equal(response.status, 422);

    const payload = await response.json();
    assert.equal(payload?.ok, false);
    assert.equal(payload?.error?.details?.code, "CONSTRUCTOR_TASK_UNDERSPECIFIED");
    assert.match(payload?.error?.message ?? "", /Add a clearer task description before dispatch/);
    assert.equal(globalThis.__dispatchCalls.length, 0);
    assert.equal(globalThis.__executionLogs.some((entry) => entry.line.includes("reason=underspecified_task")), true);
  } finally {
    resetGlobals();
    if (previousMissionControlBaseUrl === undefined) {
      delete process.env.MISSION_CONTROL_BASE_URL;
    } else {
      process.env.MISSION_CONTROL_BASE_URL = previousMissionControlBaseUrl;
    }
  }
});

test("constructor dispatch route rejects requests when no API token is configured", async () => {
  const previousMissionControlBaseUrl = process.env.MISSION_CONTROL_BASE_URL;

  resetGlobals();
  process.env.MISSION_CONTROL_BASE_URL = "http://127.0.0.1:3000";
  globalThis.__constructorIntegration = {
    id: "ctor-1",
    label: "Primary Constructor",
    baseUrl: "http://127.0.0.1:9999",
    apiToken: null,
    enabled: true
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-123/constructor/dispatch", { method: "POST" }),
      { params: { taskId: "task-123" } }
    );

    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.equal(payload?.ok, false);
    assert.equal(payload?.error?.message, "Constructor API token is required before dispatch.");
    assert.equal(payload?.error?.details?.code, "CONSTRUCTOR_API_TOKEN_REQUIRED");
    assert.equal(globalThis.__dispatchCalls.length, 0);
    assert.equal(globalThis.__executionLogs.some((entry) => entry.line.includes("reason=missing_api_token")), true);
  } finally {
    resetGlobals();
    if (previousMissionControlBaseUrl === undefined) {
      delete process.env.MISSION_CONTROL_BASE_URL;
    } else {
      process.env.MISSION_CONTROL_BASE_URL = previousMissionControlBaseUrl;
    }
  }
});