import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { signIn, json } from "./helpers.mjs";

function startMockOpenClaw() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });

    if (req.method === "POST" && req.url === "/tools/invoke") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, result: [{ id: "builder", capabilities: ["code", "review"] }] }));
      return;
    }

    if (req.method === "POST" && req.url === "/hooks/agent") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "hook_run_123", result: { response: "OpenClaw completed the task and is replying in comment." } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function startLegacyBridgeOpenClaw() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });

    if (req.method === "POST" && req.url === "/tools/invoke") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, result: [{ id: "builder", capabilities: ["code", "review"] }] }));
      return;
    }

    if (req.method === "POST" && req.url === "/hooks/agent") {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: { message: "Unauthorized hook token." } }));
      return;
    }

    if (req.method === "POST" && req.url === "/dispatch") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, result: { id: "legacy_run_456", response: "Legacy bridge dispatch completed and replied in comment." } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

test("owner can dispatch an OpenClaw-assigned task and receive the final response as an agent comment", async () => {
  const cookie = await signIn();
  const mock = await startMockOpenClaw();

  try {
    await json("/api/workspaces/current/openclaw", {
      method: "PATCH",
      cookie,
      body: {
        label: "Local OpenClaw",
        baseUrl: mock.baseUrl,
        gatewayToken: "dispatch-token",
        enabled: true
      }
    });

    const sync = await json("/api/workspaces/current/openclaw/sync", { method: "POST", cookie });
    assert.equal(sync.response.status, 200);
    const workspace = await json("/api/workspaces/current", { cookie });
    const openclawAgent = workspace.payload?.data?.workspace?.agents?.find((agent) => agent.sourceSystem === "openclaw");
    assert.ok(openclawAgent, "expected synced openclaw agent");

    const projectCreate = await json("/api/projects", {
      method: "POST",
      cookie,
      body: { name: "OpenClaw Dispatch Project" }
    });
    const projectSlug = projectCreate.payload?.data?.project?.slug;
    assert.ok(projectSlug);

    const members = await json(`/api/projects/${projectSlug}/members`, { cookie });
    const selected = members.payload?.data?.selectedMemberIds ?? [];
    await json(`/api/projects/${projectSlug}/members`, {
      method: "PUT",
      cookie,
      body: {
        membershipIds: [...selected, openclawAgent.id],
        memberRoles: { [openclawAgent.id]: "member" }
      }
    });

    const taskCreate = await json(`/api/projects/${projectSlug}/tasks`, {
      method: "POST",
      cookie,
      body: {
        title: "Dispatch me",
        assigneeId: openclawAgent.id
      }
    });
    assert.equal(taskCreate.response.status, 201);
    const taskId = taskCreate.payload?.data?.task?.id;

    const dispatch = await json(`/api/tasks/${taskId}/openclaw/dispatch`, {
      method: "POST",
      cookie
    });

    assert.equal(dispatch.response.status, 201);
    assert.equal(dispatch.payload?.data?.dispatch?.responseId, "hook_run_123");

    const responseRequest = mock.requests.find((request) => request.url === "/hooks/agent");
    assert.ok(responseRequest, "expected dispatch request");
    const payload = JSON.parse(responseRequest.body);
    assert.equal(payload.agentId, "builder");
    assert.equal(payload.wakeMode, "now");
    assert.equal(payload.deliver, false);
    assert.equal(payload.thinking, "medium");
    assert.equal(payload.timeoutSeconds, 120);
    assert.match(payload.message, /Respond with one concise final answer/);

    const comments = await json(`/api/tasks/${taskId}/comments`, { cookie });
    assert.equal(comments.response.status, 200);
    const agentComment = comments.payload?.data?.comments?.find((comment) => comment.author === openclawAgent.name);
    assert.ok(agentComment, "expected an agent-authored comment from OpenClaw response");
    assert.match(agentComment.body, /replying in comment/);
  } finally {
    mock.server.close();
  }
});

test("owner can dispatch through a legacy bridge when /hooks/agent is unauthorized", async () => {
  const cookie = await signIn();
  const mock = await startLegacyBridgeOpenClaw();

  try {
    await json("/api/workspaces/current/openclaw", {
      method: "PATCH",
      cookie,
      body: {
        label: "Legacy Bridge OpenClaw",
        baseUrl: mock.baseUrl,
        gatewayToken: "dispatch-token",
        enabled: true
      }
    });

    const sync = await json("/api/workspaces/current/openclaw/sync", { method: "POST", cookie });
    assert.equal(sync.response.status, 200);
    const workspace = await json("/api/workspaces/current", { cookie });
    const openclawAgent = workspace.payload?.data?.workspace?.agents?.find((agent) => agent.sourceSystem === "openclaw");
    assert.ok(openclawAgent, "expected synced openclaw agent");

    const projectCreate = await json("/api/projects", {
      method: "POST",
      cookie,
      body: { name: "OpenClaw Legacy Bridge Project" }
    });
    const projectSlug = projectCreate.payload?.data?.project?.slug;
    assert.ok(projectSlug);

    const members = await json(`/api/projects/${projectSlug}/members`, { cookie });
    const selected = members.payload?.data?.selectedMemberIds ?? [];
    await json(`/api/projects/${projectSlug}/members`, {
      method: "PUT",
      cookie,
      body: {
        membershipIds: [...selected, openclawAgent.id],
        memberRoles: { [openclawAgent.id]: "member" }
      }
    });

    const taskCreate = await json(`/api/projects/${projectSlug}/tasks`, {
      method: "POST",
      cookie,
      body: {
        title: "Dispatch me through legacy bridge",
        assigneeId: openclawAgent.id
      }
    });
    assert.equal(taskCreate.response.status, 201);
    const taskId = taskCreate.payload?.data?.task?.id;

    const dispatch = await json(`/api/tasks/${taskId}/openclaw/dispatch`, {
      method: "POST",
      cookie
    });

    assert.equal(dispatch.response.status, 201);
    assert.equal(dispatch.payload?.data?.dispatch?.responseId, "legacy_run_456");

    const hookRequest = mock.requests.find((request) => request.url === "/hooks/agent");
    assert.ok(hookRequest, "expected initial hook dispatch attempt");

    const bridgeRequest = mock.requests.find((request) => request.url === "/dispatch");
    assert.ok(bridgeRequest, "expected legacy bridge fallback request");
    const bridgePayload = JSON.parse(bridgeRequest.body);
    assert.equal(bridgePayload.agentId, "builder");
    assert.match(bridgePayload.prompt, /Respond with one concise final answer/);

    const comments = await json(`/api/tasks/${taskId}/comments`, { cookie });
    assert.equal(comments.response.status, 200);
    const agentComment = comments.payload?.data?.comments?.find((comment) => comment.author === openclawAgent.name);
    assert.ok(agentComment, "expected an agent-authored comment from legacy bridge response");
    assert.match(agentComment.body, /Legacy bridge dispatch completed/);
  } finally {
    mock.server.close();
  }
});
