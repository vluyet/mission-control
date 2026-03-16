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

    if (req.method === "POST" && req.url === "/v1/responses") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "resp_mock_123", status: "queued" }));
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

test("owner can dispatch an OpenClaw-assigned task through the linked gateway", async () => {
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
    assert.equal(dispatch.payload?.data?.dispatch?.responseId, "resp_mock_123");

    const responseRequest = mock.requests.find((request) => request.url === "/v1/responses");
    assert.ok(responseRequest, "expected dispatch request");
    const payload = JSON.parse(responseRequest.body);
    assert.equal(payload.model, "agent:builder");
    assert.match(payload.input, /Mission Control base URL:/);
    assert.match(payload.input, /\/api\/tasks\/.+\/execution/);
  } finally {
    mock.server.close();
  }
});
