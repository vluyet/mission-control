type ContextValue = Record<string, unknown>;

export type ResolvedTaskContext = {
  resolution_order: ["workspace", "project", "task"];
  layers: {
    workspace: ContextValue;
    project: ContextValue;
    task: {
      hint: string | null;
    };
  };
  merged: ContextValue & {
    bullets: string[];
    task_hint: string | null;
  };
  trace: Array<{
    source: "workspace" | "project" | "task";
    fields: string[];
  }>;
};

function toContextValue(input: unknown): ContextValue {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as ContextValue;
}

function toStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function resolveTaskContext(input: {
  workspace: unknown;
  project: unknown;
  taskHint?: string | null;
}): ResolvedTaskContext {
  const workspace = toContextValue(input.workspace);
  const project = toContextValue(input.project);
  const taskHint = input.taskHint ?? null;

  const workspaceBullets = toStringArray(workspace.bullets);
  const projectBullets = toStringArray(project.bullets);
  const mergedBullets = unique([...workspaceBullets, ...projectBullets]);

  return {
    resolution_order: ["workspace", "project", "task"],
    layers: {
      workspace,
      project,
      task: {
        hint: taskHint
      }
    },
    merged: {
      ...workspace,
      ...project,
      bullets: mergedBullets,
      task_hint: taskHint
    },
    trace: [
      {
        source: "workspace",
        fields: Object.keys(workspace)
      },
      {
        source: "project",
        fields: Object.keys(project)
      },
      {
        source: "task",
        fields: taskHint ? ["hint"] : []
      }
    ]
  };
}
