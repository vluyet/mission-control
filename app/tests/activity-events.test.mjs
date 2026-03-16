import test from "node:test";
import assert from "node:assert/strict";
import { signIn, json } from "./helpers.mjs";

test("task creation, update, and comment writes generate activity entries", async () => {
  const cookie = await signIn();
  const projectName = `Activity project ${Date.now()}`;
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

  const title = `Activity task ${Date.now()}`;

  const create = await json(`/api/projects/${projectSlug}/tasks`, {
    method: "POST",
    cookie,
    body: {
      title,
      tags: ["QA", "Activity"]
    }
  });

  assert.equal(create.response.status, 201);
  const taskId = create.payload?.data?.task?.id;
  assert.ok(taskId);

  const update = await json(`/api/tasks/${taskId}`, {
    method: "PATCH",
    cookie,
    body: {
      status: "in_progress",
      actorType: "human"
    }
  });

  assert.equal(update.response.status, 200);

  const comment = await json(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    cookie,
    body: {
      author: "Workspace Owner",
      role: "Owner",
      tone: "human",
      body: "Activity smoke test comment."
    }
  });

  assert.equal(comment.response.status, 201);

  const activity = await json(`/api/tasks/${taskId}/activity`, { cookie });
  assert.equal(activity.response.status, 200);

  const labels = activity.payload?.data?.activity?.map((item) => item.label) ?? [];
  assert.ok(labels.includes("Task created"));
  assert.ok(labels.includes("Task updated"));
  assert.ok(labels.includes("Comment added"));
});
