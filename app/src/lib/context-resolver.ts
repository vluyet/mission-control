type ContextValue = Record<string, unknown>;

type CompactContextLayer = {
  title: string | null;
  summary: string | null;
  bullets: string[];
  principles: string[];
  constraints: string[];
};

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
    principles: string[];
    constraints: string[];
    task_hint: string | null;
  };
  compact: {
    workspace: CompactContextLayer;
    project: CompactContextLayer;
    effective: {
      summary: string[];
      bullets: string[];
      principles: string[];
      constraints: string[];
      taskHint: string | null;
    };
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

function toTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function compactLayer(value: ContextValue): CompactContextLayer {
  return {
    title: toTrimmedString(value.title),
    summary: toTrimmedString(value.summary),
    bullets: unique(toStringArray(value.bullets).map((item) => item.trim()).filter(Boolean)).slice(0, 5),
    principles: unique(toStringArray(value.principles).map((item) => item.trim()).filter(Boolean)).slice(0, 4),
    constraints: unique(toStringArray(value.constraints).map((item) => item.trim()).filter(Boolean)).slice(0, 4)
  };
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
  const compactWorkspace = compactLayer(workspace);
  const compactProject = compactLayer(project);
  const effectiveSummary = [compactWorkspace.summary, compactProject.summary].filter((value): value is string => Boolean(value));
  const mergedPrinciples = unique([...compactWorkspace.principles, ...compactProject.principles]);
  const mergedConstraints = unique([...compactWorkspace.constraints, ...compactProject.constraints]);

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
      principles: mergedPrinciples,
      constraints: mergedConstraints,
      task_hint: taskHint
    },
    compact: {
      workspace: compactWorkspace,
      project: compactProject,
      effective: {
        summary: effectiveSummary,
        bullets: unique([...compactWorkspace.bullets, ...compactProject.bullets]).slice(0, 8),
        principles: mergedPrinciples.slice(0, 6),
        constraints: mergedConstraints.slice(0, 6),
        taskHint
      }
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
