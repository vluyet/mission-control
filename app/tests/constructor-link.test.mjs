import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  signIn,
  json,
  upsertWorkspaceConstructorIntegration,
  createTemporaryWorkspaceSession,
  cleanupTemporaryWorkspaceSession
} from "./helpers.mjs";

function startMockConstructor() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });

    if (req.method === "GET" && req.url === "/api/v1/agents") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        items: [
          {
            id: "agent-research",
            name: "Research Agent",
            description: "Focused on research tasks",
            source: "gateway",
            isDefault: false
          },
          {
            id: "agent-main",
            name: "Main Agent",
            description: "General-purpose agent",
            source: "config",
            isDefault: true
          }
        ],
        defaultAgentId: "agent-main"
      }));
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

test("owner can save Constructor settings and sync Constructor agents through the public API", async () => {
  const authCookie = await signIn();
  const session = await createTemporaryWorkspaceSession(authCookie, "Constructor link test");
  const cookie = session.cookie;
  let mock;

  try {
    mock = await startMockConstructor();

    const save = await upsertWorkspaceConstructorIntegration(cookie, {
      label: "Local Constructor",
      baseUrl: mock.baseUrl,
      apiToken: "test-token",
      enabled: true
    });

    assert.equal(save.response.status, 200);
    assert.equal(save.payload?.data?.integration?.baseUrl, mock.baseUrl);
    assert.equal(save.payload?.data?.integration?.apiTokenConfigured, true);

    const stored = await json("/api/workspaces/current/constructor", { cookie });
    assert.equal(stored.response.status, 200);
    assert.equal(stored.payload?.data?.integration?.label, "Local Constructor");
    assert.equal(stored.payload?.data?.integration?.baseUrl, mock.baseUrl);
    assert.equal(stored.payload?.data?.integration?.apiTokenConfigured, true);

    const sync = await json("/api/workspaces/current/constructor/sync", {
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
    assert.equal(agents.some((agent) => agent.sourceSystem === "constructor" && agent.name === "Research Agent"), true);
    assert.equal(agents.some((agent) => agent.sourceSystem === "constructor" && agent.name === "Main Agent"), true);
  } finally {
    mock?.server.close();
    await cleanupTemporaryWorkspaceSession(authCookie, session);
  }
});
