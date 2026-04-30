import { db } from "@/lib/db";
import { getStableConstructorExternalTaskId } from "@/lib/constructor";

type ConstructorTaskRuntimeBase = {
  taskId: string;
  workspaceId: string;
  projectSlug: string | null;
  externalTaskId: string;
};

export type ConstructorTaskRuntime =
  | { kind: "missing_task" }
  | ({ kind: "disabled" } & ConstructorTaskRuntimeBase)
  | ({ kind: "not_configured" } & ConstructorTaskRuntimeBase)
  | ({ kind: "api_token_required"; baseUrl: string } & ConstructorTaskRuntimeBase)
  | ({ kind: "ready"; baseUrl: string; apiToken: string } & ConstructorTaskRuntimeBase);

export async function getTaskConstructorRuntime(taskId: string): Promise<ConstructorTaskRuntime> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      project: {
        select: {
          slug: true,
          workspaceId: true
        }
      }
    }
  });

  if (!task) {
    return { kind: "missing_task" };
  }

  const integration = await db.workspaceConstructorIntegration.findUnique({
    where: { workspaceId: task.project.workspaceId }
  });
  const externalTaskId = getStableConstructorExternalTaskId(task.id);
  const base = {
    taskId: task.id,
    workspaceId: task.project.workspaceId,
    projectSlug: task.project.slug ?? null,
    externalTaskId
  } satisfies ConstructorTaskRuntimeBase;

  if (integration?.enabled === false) {
    return {
      kind: "disabled",
      ...base
    };
  }

  const configuredBaseUrl = integration?.baseUrl?.trim() || process.env.CONSTRUCTOR_BASE_URL?.trim() || null;
  const apiToken = integration?.apiToken?.trim() || process.env.CONSTRUCTOR_API_TOKEN?.trim() || null;

  if (!integration && !configuredBaseUrl && !apiToken) {
    return {
      kind: "not_configured",
      ...base
    };
  }

  const baseUrl = configuredBaseUrl || "http://127.0.0.1:8787";

  if (!apiToken) {
    return {
      kind: "api_token_required",
      ...base,
      baseUrl
    };
  }

  return {
    kind: "ready",
    ...base,
    baseUrl,
    apiToken
  };
}