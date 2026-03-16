import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { signIn, json } from "./helpers.mjs";

test("owner can register an OpenClaw instance and sync agents from config", async () => {
  const cookie = await signIn();
  const configPath = join("/tmp", `openclaw-sync-${Date.now()}.json`);

  await writeFile(
    configPath,
    JSON.stringify({
      agents: {
        list: [
          {
            id: "planner-01",
            name: "Planner-01",
            labels: ["planning", "triage"]
          },
          {
            id: "builder-02",
            name: "Builder-02",
            mcpServers: ["github", "filesystem"]
          }
        ]
      }
    }),
    "utf8"
  );

  const save = await json("/api/workspaces/current/openclaw", {
    method: "PATCH",
    cookie,
    body: {
      label: "Primary OpenClaw",
      enabled: true,
      discoveryMode: "config_file",
      configPath
    }
  });

  assert.equal(save.response.status, 200);

  const sync = await json("/api/workspaces/current/openclaw/sync", {
    method: "POST",
    cookie
  });

  assert.equal(sync.response.status, 200);
  assert.equal(sync.payload?.data?.discoveredAgents?.length, 2);

  const workspace = await json("/api/workspaces/current", { cookie });
  assert.equal(workspace.response.status, 200);

  const agents = workspace.payload?.data?.workspace?.agents ?? [];
  assert.equal(agents.length, 2);
  assert.deepEqual(
    agents.map((agent) => agent.name).sort(),
    ["Builder-02", "Planner-01"]
  );
  assert.equal(workspace.payload?.data?.workspace?.openclawIntegration?.lastSyncStatus, "success");
});
