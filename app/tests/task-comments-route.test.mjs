import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const routeSource = path.join(appDir, "src/app/api/tasks/[taskId]/comments/route.ts");
const outdir = path.resolve("/tmp/mission-control-task-comments-route-tests");

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
    .replace('from "@/app/api/tasks/[taskId]/constructor/dispatch/route"', 'from "./stubs/constructor-dispatch-route.mjs"')
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
    'export async function resolveApiActor() {\n' +
      '  return globalThis.__commentAuth ?? { ok: true, actor: { type: "owner", label: "owner@example.com" } };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "constructor-dispatch-route.mjs"),
    'export async function getLatestConstructorSession(taskId) {\n' +
      '  (globalThis.__latestSessionCalls ??= []).push(taskId);\n' +
      '  return globalThis.__latestSession ?? { sessionId: null, externalTaskId: null, idempotencyKey: null };\n' +
      '}\n' +
      'export async function dispatchMissionControlTaskToConstructor(input) {\n' +
      '  (globalThis.__mentionDispatchCalls ??= []).push(input);\n' +
      '  return globalThis.__mentionDispatchResult ?? {\n' +
      '    ok: true,\n' +
      '    status: 202,\n' +
      '    body: {\n' +
      '      dispatch: {\n' +
      '        accepted: true,\n' +
      '        externalTaskId: "external-1",\n' +
      '        idempotencyKey: "idem-1",\n' +
      '        sessionId: "session-1"\n' +
      '      }\n' +
      '    }\n' +
      '  };\n' +
      '}\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "server-data.mjs"),
    'export async function getTaskResourceFromDb(taskId) {\n' +
      '  return globalThis.__taskResource ?? { task: { id: taskId, title: "Task title", description: "Task description" } };\n' +
      '}\n' +
      'export async function getTaskCommentsFromDb() {\n' +
      '  return globalThis.__taskComments ?? [];\n' +
      '}\n' +
      'export async function createCommentInDb(taskId, payload) {\n' +
      '  (globalThis.__createdComments ??= []).push({ taskId, payload });\n' +
      '  return globalThis.__createdComment ?? { id: "comment-1", body: payload.body, author: payload.author };\n' +
      '}\n' +
      'export async function appendSystemExecutionLogInDb(taskId, line, label) {\n' +
      '  (globalThis.__commentExecutionLogs ??= []).push({ taskId, line, label });\n' +
      '}\n',
    "utf8"
  );

  return import(`${pathToFileURL(path.join(outdir, "route.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

function resetGlobals() {
  globalThis.__mentionDispatchCalls = [];
  globalThis.__latestSessionCalls = [];
  globalThis.__createdComments = [];
  globalThis.__commentExecutionLogs = [];
  delete globalThis.__latestSession;
  delete globalThis.__mentionDispatchResult;
  delete globalThis.__createdComment;
  delete globalThis.__taskResource;
  delete globalThis.__taskComments;
  delete globalThis.__commentAuth;
}

test("comment POST dispatches @mentions through Constructor using the latest session context", async () => {
  resetGlobals();
  globalThis.__latestSession = {
    sessionId: "session-existing",
    externalTaskId: "external-existing",
    idempotencyKey: "idem-existing"
  };
  globalThis.__taskResource = {
    task: {
      id: "task-123",
      title: "Prepare customer email",
      description: "Write a prospecting email for SMEs about Mission Control."
    }
  };
  globalThis.__taskComments = [
    {
      id: "comment-prev-agent",
      author: "Echo",
      role: "Agent",
      tone: "agent",
      body: "Draft email v1"
    },
    {
      id: "comment-prev-owner",
      author: "Vincent",
      role: "Owner",
      tone: "human",
      body: "Please make it sharper"
    }
  ];

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-123/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          author: "Vincent",
          role: "Owner",
          tone: "human",
          body: "@Echo please continue with the next fix"
        })
      }),
      { params: { taskId: "task-123" } }
    );

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.mentionDispatch?.triggered, true);
    assert.equal(payload?.data?.mentionDispatch?.accepted, true);
    assert.deepEqual(payload?.data?.mentionDispatch?.target, ["Echo"]);
    assert.equal(payload?.data?.mentionDispatch?.sessionId, "session-1");
    assert.equal(payload?.data?.mentionDispatch?.externalTaskId, "external-1");
    assert.equal(payload?.data?.mentionDispatch?.idempotencyKey, "idem-1");

    assert.equal(globalThis.__latestSessionCalls.length, 1);
    assert.equal(globalThis.__latestSessionCalls[0], "task-123");
    assert.equal(globalThis.__mentionDispatchCalls.length, 1);
    const dispatchCall = globalThis.__mentionDispatchCalls[0];
    assert.equal(dispatchCall.taskId, "task-123");
    assert.equal(dispatchCall.sessionId, "session-existing");
    assert.equal(dispatchCall.externalTaskId, "mc-task-task-123-comment-comment-1");
    assert.equal(dispatchCall.idempotencyKey, "mc-task-task-123-comment-comment-1");
    assert.equal(dispatchCall.metadata.origin, "mission-control-comment-mention");
    assert.equal(dispatchCall.metadata.trigger, "task-comment-mention");
    assert.deepEqual(dispatchCall.metadata.mentionedAgents, ["Echo"]);
    assert.match(dispatchCall.instruction, /Original task title: Prepare customer email/);
    assert.match(dispatchCall.instruction, /Original requested deliverable:\nWrite a prospecting email for SMEs about Mission Control\./);
    assert.match(dispatchCall.instruction, /Latest agent draft\/output to revise:\nDraft email v1/);
    assert.match(dispatchCall.instruction, /Recent task comments:/);
    assert.match(dispatchCall.instruction, /Latest human follow-up from Vincent:/);
    assert.match(dispatchCall.instruction, /@Echo please continue with the next fix/);
  } finally {
    resetGlobals();
  }
});

test("comment POST returns a non-accepted mentionDispatch payload and logs when Constructor dispatch fails", async () => {
  resetGlobals();
  globalThis.__mentionDispatchResult = {
    ok: false,
    status: 422,
    message: "Assign the task to a Constructor agent or sync a default Constructor agent before dispatch.",
    details: { code: "CONSTRUCTOR_TARGET_AGENT_REQUIRED" }
  };

  try {
    const { POST } = await loadRouteModule();
    const response = await POST(
      new Request("http://127.0.0.1:3000/api/tasks/task-456/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          author: "Vincent",
          role: "Owner",
          tone: "human",
          body: "Need help from @Echo on this one"
        })
      }),
      { params: { taskId: "task-456" } }
    );

    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload?.ok, true);
    assert.equal(payload?.data?.mentionDispatch?.triggered, true);
    assert.equal(payload?.data?.mentionDispatch?.accepted, false);
    assert.equal(payload?.data?.mentionDispatch?.code, "CONSTRUCTOR_TARGET_AGENT_REQUIRED");
    assert.match(payload?.data?.mentionDispatch?.message, /Assign the task/);
    assert.equal(globalThis.__commentExecutionLogs.length, 1);
    assert.match(globalThis.__commentExecutionLogs[0].line, /CONSTRUCTOR_MENTION_DISPATCH_FAILED/);
    assert.match(globalThis.__commentExecutionLogs[0].line, /target=Echo/);
  } finally {
    resetGlobals();
  }
});
