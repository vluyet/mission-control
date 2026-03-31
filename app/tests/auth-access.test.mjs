import test from "node:test";
import assert from "node:assert/strict";
import { signIn, json } from "./helpers.mjs";

test("owner can create a project and first task from the current workspace state", async () => {
  const cookie = await signIn();

  const workspace = await json("/api/workspaces/current", { cookie });
  assert.equal(workspace.response.status, 200);
  const initialProjectCount = workspace.payload?.data?.workspace?.projectCount;
  assert.equal(typeof initialProjectCount, "number");
  assert.ok(initialProjectCount >= 0);

  const projectCreate = await json("/api/projects", {
    method: "POST",
    cookie,
    body: {
      name: "Launch setup",
      description: "First project in an empty workspace."
    }
  });

  assert.equal(projectCreate.response.status, 201);
  const projectSlug = projectCreate.payload?.data?.project?.slug;
  assert.ok(projectSlug, "expected new project slug");

  const refreshedWorkspace = await json("/api/workspaces/current", { cookie });
  assert.equal(refreshedWorkspace.response.status, 200);
  assert.equal(refreshedWorkspace.payload?.data?.workspace?.projectCount, initialProjectCount + 1);

  const taskCreate = await json(`/api/projects/${projectSlug}/tasks`, {
    method: "POST",
    cookie,
    body: {
      title: "Create the first task"
    }
  });

  assert.equal(taskCreate.response.status, 201);
  const taskId = taskCreate.payload?.data?.task?.id;
  assert.ok(taskId, "expected new task id");

  const taskRead = await json(`/api/tasks/${taskId}`, { cookie });
  assert.equal(taskRead.response.status, 200);
});
