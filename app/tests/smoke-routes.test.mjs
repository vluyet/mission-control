import test from "node:test";
import assert from "node:assert/strict";
import { baseUrl, signIn, json } from "./helpers.mjs";

test("main authenticated routes render successfully", async () => {
  const cookie = await signIn();

  for (const path of ["/", "/projects", "/my-tasks", "/queue", "/manage-workspace", "/docs/agents"]) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { cookie }
    });
    assert.equal(response.status, 200, `${path} should return 200`);
  }
});

test("main API routes respond successfully", async () => {
  const cookie = await signIn();

  for (const path of ["/api/search?q=review", "/api/workspaces/current", "/api/workspaces/default/context", "/api/docs/agents"]) {
    const { response, payload } = await json(path, { cookie });
    assert.equal(response.status, 200, `${path} should return 200`);
    assert.ok(payload);
  }
});
