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
      res.end(JSON.stringify({ ok: true, result: ["researcher", { id: "builder", capabilities: ["code", "review"] }] }));
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

test("owner can save OpenClaw settings and sync discovered agents", async () => {
  const cookie = await signIn();
  const mock = await startMockOpenClaw();

  try {
    const save = await json("/api/workspaces/current/openclaw", {
      method: "PATCH",
      cookie,
      body: {
        label: "Local OpenClaw",
        baseUrl: mock.baseUrl,
        gatewayToken: "test-token",
        enabled: true
      }
    });

    assert.equal(save.response.status, 200);
    assert.equal(save.payload?.data?.integration?.baseUrl, mock.baseUrl);
    assert.equal(save.payload?.data?.integration?.tokenConfigured, true);

    const sync = await json("/api/workspaces/current/openclaw/sync", {
      method: "POST",
      cookie
    });

    assert.equal(sync.response.status, 200);
    assert.equal(sync.payload?.data?.agents?.length, 2);
    assert.equal(mock.requests[0]?.auth, "Bearer test-token");

    const workspace = await json("/api/workspaces/current", { cookie });
    assert.equal(workspace.response.status, 200);
    const agents = workspace.payload?.data?.workspace?.agents ?? [];
    assert.equal(agents.length >= 2, true);
    assert.equal(agents.some((agent) => agent.sourceSystem === "openclaw" && agent.name === "Researcher"), true);
    assert.equal(agents.some((agent) => agent.sourceSystem === "openclaw" && agent.name === "Builder"), true);
  } finally {
    mock.server.close();
  }
});
