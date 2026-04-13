import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { baseUrl, signIn, json, upsertWorkspaceConstructorIntegration } from "./helpers.mjs";

function startMockConstructor() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      items: [
        {
          id: "agent-main",
          name: "Main Agent",
          description: "General-purpose Constructor agent",
          source: "config",
          isDefault: true
        }
      ],
      defaultAgentId: "agent-main"
    }));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function syncMainConstructorAgent(cookie) {
  const mock = await startMockConstructor();

  const integration = await upsertWorkspaceConstructorIntegration(cookie, {
    label: "Default Constructor",
    baseUrl: mock.baseUrl,
    apiToken: "test-token",
    callbackToken: "",
    enabled: true
  });
  assert.equal(integration.response.status, 200);

  const sync = await json("/api/workspaces/current/constructor/sync", {
    method: "POST",
    cookie
  });
  assert.equal(sync.response.status, 200);

  const workspace = await json("/api/workspaces/current", { cookie });
  assert.equal(workspace.response.status, 200);

  const mainAgent = (workspace.payload?.data?.workspace?.agents ?? []).find(
    (agent) => agent.sourceSystem === "constructor" && agent.name === "Main Agent"
  );

  assert.ok(mainAgent?.id);

  return { mock, mainAgent };
}

async function createProjectAndTask(cookie, suffix, options = {}) {
  const projectName = `Constructor callback project ${suffix}`;
  const projectCreate = await json("/api/projects", {
    method: "POST",
    cookie,
    body: {
      name: projectName
    }
  });

  assert.equal(projectCreate.response.status, 201);
  const projectSlug = projectCreate.payload?.data?.project?.slug;
  assert.ok(projectSlug);

  const title = `Constructor callback task ${suffix}`;
  const create = await json(`/api/projects/${projectSlug}/tasks`, {
    method: "POST",
    cookie,
    body: {
      title,
      tags: ["Constructor", "Callback"],
      ...(options.assigneeId ? { assigneeId: options.assigneeId } : {})
    }
  });

  assert.equal(create.response.status, 201);
  const taskId = create.payload?.data?.task?.id;
  assert.ok(taskId);

  return { projectSlug, taskId };
}

test("constructor callback accepts unsigned delivery even when a callback token is saved", async () => {
  const cookie = await signIn();
  const suffix = `${Date.now()}-auth`;
  const { taskId } = await createProjectAndTask(cookie, suffix);

  const integration = await upsertWorkspaceConstructorIntegration(cookie, {
    label: "Secured Constructor",
    baseUrl: "http://127.0.0.1:8787",
    callbackToken: "constructor-secret-token",
    enabled: true
  });
  assert.equal(integration.response.status, 200);

  const callbackPayload = {
    version: "v1",
    source: "constructor",
    eventType: "execution.completed",
    emittedAt: new Date().toISOString(),
    bridgeExecutionId: `constructor:test-${suffix}`,
    externalTaskId: `external-${suffix}`,
    payload: {
      executionState: "completed",
      terminalAt: new Date().toISOString(),
      result: {
        text: "This should be rejected without the right token."
      }
    }
  };

  const accepted = await fetch(`${baseUrl}/api/tasks/${taskId}/constructor/callback`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(callbackPayload)
  });
  const acceptedPayload = await accepted.json();

  assert.equal(accepted.status, 200);
  assert.equal(acceptedPayload.ok, true);

  const comments = await json(`/api/tasks/${taskId}/comments`, { cookie });
  assert.equal(comments.response.status, 200);
  const constructorComments = (comments.payload?.data?.comments ?? []).filter((comment) => comment.tone === "agent");
  assert.equal(constructorComments.length, 1);
});

test("constructor callback retries do not create duplicate task comments", async () => {
  const cookie = await signIn();
  const suffix = Date.now();
  const { mock, mainAgent } = await syncMainConstructorAgent(cookie);

  try {
    const { taskId } = await createProjectAndTask(cookie, suffix, { assigneeId: mainAgent.id });

    const callbackPayload = {
      version: "v1",
      source: "constructor",
      eventType: "execution.completed",
      emittedAt: new Date().toISOString(),
      bridgeExecutionId: `constructor:test-${Date.now()}`,
      externalTaskId: `external-${Date.now()}`,
      payload: {
        executionState: "completed",
        terminalAt: new Date().toISOString(),
        result: {
          text: "Ship the callback result once."
        }
      },
      meta: {
        runtimeName: "openclaw",
        targetAgent: "agent-main"
      }
    };

    const first = await fetch(`${baseUrl}/api/tasks/${taskId}/constructor/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(callbackPayload)
    });
    const firstPayload = await first.json();

    assert.equal(first.status, 200);
    assert.equal(firstPayload.ok, true);
    assert.ok(firstPayload.commentId);

    const second = await fetch(`${baseUrl}/api/tasks/${taskId}/constructor/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(callbackPayload)
    });
    const secondPayload = await second.json();

    assert.equal(second.status, 200);
    assert.equal(secondPayload.ok, true);
    assert.equal(secondPayload.duplicate, true);

    const comments = await json(`/api/tasks/${taskId}/comments`, { cookie });
    assert.equal(comments.response.status, 200);

    const constructorComments = (comments.payload?.data?.comments ?? []).filter(
      (comment) => comment.tone === "agent"
    );

    assert.equal(constructorComments.length, 1);
    assert.equal(constructorComments[0]?.author, "Main Agent");
    assert.equal(constructorComments[0]?.role, "Agent");
    assert.equal(constructorComments[0]?.body, "Ship the callback result once.");
    assert.doesNotMatch(constructorComments[0]?.body ?? "", /Constructor final answer|Bridge execution|External task/);

    const task = await json(`/api/tasks/${taskId}`, { cookie });
    assert.equal(task.response.status, 200);
    assert.equal(task.payload?.data?.task?.status, "In Review");
  } finally {
    mock.server.close();
  }
});

test("constructor callback uses the responding agent for unassigned tasks and still writes receipt logs", async () => {
  const cookie = await signIn();
  const suffix = `${Date.now()}-unassigned`;
  const { mock } = await syncMainConstructorAgent(cookie);

  try {
    const { taskId } = await createProjectAndTask(cookie, suffix);

    const callbackPayload = {
      version: "v1",
      source: "constructor",
      eventType: "execution.completed",
      emittedAt: new Date().toISOString(),
      bridgeExecutionId: `constructor:test-${suffix}`,
      externalTaskId: `external-${suffix}`,
      payload: {
        executionState: "completed",
        terminalAt: new Date().toISOString(),
        result: {
          text: "Write receipt logs even without an assigned agent."
        }
      },
      meta: {
        runtimeName: "openclaw",
        targetAgent: "agent-main"
      }
    };

    const first = await fetch(`${baseUrl}/api/tasks/${taskId}/constructor/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(callbackPayload)
    });
    assert.equal(first.status, 200);

    const second = await fetch(`${baseUrl}/api/tasks/${taskId}/constructor/callback`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(callbackPayload)
    });
    const secondPayload = await second.json();

    assert.equal(second.status, 200);
    assert.equal(secondPayload.ok, true);
    assert.equal(secondPayload.duplicate, true);

    const comments = await json(`/api/tasks/${taskId}/comments`, { cookie });
    assert.equal(comments.response.status, 200);
    const constructorComments = (comments.payload?.data?.comments ?? []).filter((comment) => comment.tone === "agent");
    assert.equal(constructorComments.length, 1);
    assert.equal(constructorComments[0]?.author, "Main Agent");
    assert.equal(constructorComments[0]?.body, "Write receipt logs even without an assigned agent.");
    assert.doesNotMatch(constructorComments[0]?.body ?? "", /Constructor final answer|Bridge execution|External task/);

    const execution = await json(`/api/tasks/${taskId}/execution`, { cookie });
    assert.equal(execution.response.status, 200);
    assert.ok(
      execution.payload?.data?.logs?.some((line) =>
        line.includes(`CONSTRUCTOR_CALLBACK_RECEIVED event=execution.completed bridgeExecutionId=${callbackPayload.bridgeExecutionId}`)
      )
    );
    assert.ok(
      execution.payload?.data?.logs?.some((line) =>
        line.includes(`CONSTRUCTOR_CALLBACK_DUPLICATE_IGNORED event=execution.completed bridgeExecutionId=${callbackPayload.bridgeExecutionId}`)
      )
    );
  } finally {
    mock.server.close();
  }
});
