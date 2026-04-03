import test from "node:test";
import assert from "node:assert/strict";
import { baseUrl, signIn, json } from "./helpers.mjs";

async function createProjectAndTask(cookie, suffix) {
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
      tags: ["Constructor", "Callback"]
    }
  });

  assert.equal(create.response.status, 201);
  const taskId = create.payload?.data?.task?.id;
  assert.ok(taskId);

  return { projectSlug, taskId };
}

test("constructor callback retries do not create duplicate task comments", async () => {
  const cookie = await signIn();
  const suffix = Date.now();
  const { taskId } = await createProjectAndTask(cookie, suffix);

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
      targetAgent: "main"
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
  assert.equal(constructorComments[0]?.author, "Constructor v2");
  assert.equal(constructorComments[0]?.role, "Agent");
  assert.match(constructorComments[0]?.body ?? "", /Constructor v2 final answer/);
  assert.match(constructorComments[0]?.body ?? "", /Ship the callback result once\./);
  assert.match(constructorComments[0]?.body ?? "", new RegExp(callbackPayload.bridgeExecutionId));

  const task = await json(`/api/tasks/${taskId}`, { cookie });
  assert.equal(task.response.status, 200);
  assert.equal(task.payload?.data?.task?.status, "In Review");
});

test("constructor callback system log writes work for unassigned tasks", async () => {
  const cookie = await signIn();
  const suffix = `${Date.now()}-unassigned`;
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
      targetAgent: "main"
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
});
