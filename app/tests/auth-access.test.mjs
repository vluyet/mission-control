import test from "node:test";
import assert from "node:assert/strict";
import { signIn, json } from "./helpers.mjs";

function cookiePair(setCookieHeader) {
  return setCookieHeader?.split(";")[0] ?? null;
}

test("project creation requires authentication", async () => {
  const projectCreate = await json("/api/projects", {
    method: "POST",
    body: {
      name: "Unauthorized project"
    }
  });

  assert.equal(projectCreate.response.status, 401);
  assert.equal(projectCreate.payload?.error?.details?.code, "UNAUTHENTICATED");
});

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

test("owner can create, switch, move, and delete workspaces through the new workspace routes", async () => {
  const authCookie = await signIn();

  const sourceWorkspace = await json("/api/workspaces/current", { cookie: authCookie });
  assert.equal(sourceWorkspace.response.status, 200);
  const sourceSlug = sourceWorkspace.payload?.data?.workspace?.slug;
  assert.ok(sourceSlug, "expected source workspace slug");

  const projectCreate = await json("/api/projects", {
    method: "POST",
    cookie: authCookie,
    body: {
      name: "Workspace transfer validation",
      description: "Project used to validate workspace move flow."
    }
  });

  assert.equal(projectCreate.response.status, 201);
  const projectSlug = projectCreate.payload?.data?.project?.slug;
  assert.ok(projectSlug, "expected moved project slug");

  const workspaceName = `Workspace CRUD Validation ${Date.now()}`;
  const workspaceCreate = await json("/api/workspaces", {
    method: "POST",
    cookie: authCookie,
    body: {
      name: workspaceName,
      visibility: "personal"
    }
  });

  assert.equal(workspaceCreate.response.status, 201);
  const targetSlug = workspaceCreate.payload?.data?.workspace?.slug;
  assert.ok(targetSlug, "expected target workspace slug");

  const workspaceList = await json("/api/workspaces", { cookie: authCookie });
  assert.equal(workspaceList.response.status, 200);
  assert.ok(
    workspaceList.payload?.data?.workspaces?.some((workspace) => workspace.slug === targetSlug),
    "expected workspace list to include created workspace"
  );

  const moveResponse = await json("/api/workspaces/projects/move", {
    method: "POST",
    cookie: authCookie,
    body: {
      projectSlug,
      targetWorkspaceSlug: targetSlug
    }
  });

  assert.equal(moveResponse.response.status, 200);
  const movedProjectSlug = moveResponse.payload?.data?.project?.slug;
  assert.ok(movedProjectSlug, "expected moved project slug");
  assert.equal(moveResponse.payload?.data?.project?.workspaceSlug, targetSlug);

  const switchResponse = await json("/api/workspaces/active", {
    method: "POST",
    cookie: authCookie,
    body: {
      slug: targetSlug
    }
  });

  assert.equal(switchResponse.response.status, 200);
  const workspaceCookie = cookiePair(switchResponse.response.headers.get("set-cookie"));
  assert.ok(workspaceCookie, "expected workspace cookie after switch");
  const combinedCookie = `${authCookie}; ${workspaceCookie}`;

  const switchedWorkspace = await json("/api/workspaces/current", { cookie: combinedCookie });
  assert.equal(switchedWorkspace.response.status, 200);
  assert.equal(switchedWorkspace.payload?.data?.workspace?.slug, targetSlug);
  assert.ok(
    switchedWorkspace.payload?.data?.workspace?.projects?.some((project) => project.slug === movedProjectSlug),
    "expected switched workspace to include moved project"
  );

  const deleteResponse = await json(`/api/workspaces/${targetSlug}`, {
    method: "DELETE",
    cookie: authCookie
  });

  assert.equal(deleteResponse.response.status, 200);
  assert.equal(deleteResponse.payload?.data?.deletedWorkspace?.slug, targetSlug);
  assert.equal(deleteResponse.payload?.data?.fallbackWorkspace?.slug, sourceSlug);
});
