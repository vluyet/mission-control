import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = path.join(appDir, "src/lib/context-resolver.ts");
const outdir = path.resolve("/tmp/mission-control-context-resolver-tests");

async function loadModule() {
  const source = await fs.readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: sourcePath
  }).outputText;

  await fs.mkdir(outdir, { recursive: true });
  const outPath = path.join(outdir, "context-resolver.mjs");
  await fs.writeFile(outPath, transpiled, "utf8");
  return import(`${pathToFileURL(outPath).href}?t=${Date.now()}-${Math.random()}`);
}

test("resolveTaskContext merges compact bullets, principles, constraints, and task hint additively", async () => {
  const { resolveTaskContext } = await loadModule();

  const result = resolveTaskContext({
    workspace: {
      title: "Workspace Alpha",
      summary: "Shared delivery rules",
      bullets: ["Keep updates concise", "Respect approvals"],
      principles: ["Prefer reversible changes", "Keep context compact"],
      constraints: ["No production writes", "Stay local by default"]
    },
    project: {
      title: "Project Beta",
      summary: "Launch prep",
      bullets: ["Target SMEs first", "Respect approvals"],
      principles: ["Keep context compact", "Favor deterministic inputs"],
      constraints: ["Stay local by default", "Avoid long prose"]
    },
    taskHint: "Focus on the next explicit deliverable."
  });

  assert.deepEqual(result.compact.workspace.principles, ["Prefer reversible changes", "Keep context compact"]);
  assert.deepEqual(result.compact.project.constraints, ["Stay local by default", "Avoid long prose"]);
  assert.deepEqual(result.merged.bullets, ["Keep updates concise", "Respect approvals", "Target SMEs first"]);
  assert.deepEqual(result.merged.principles, ["Prefer reversible changes", "Keep context compact", "Favor deterministic inputs"]);
  assert.deepEqual(result.merged.constraints, ["No production writes", "Stay local by default", "Avoid long prose"]);
  assert.deepEqual(result.compact.effective.summary, ["Shared delivery rules", "Launch prep"]);
  assert.deepEqual(result.compact.effective.principles, ["Prefer reversible changes", "Keep context compact", "Favor deterministic inputs"]);
  assert.deepEqual(result.compact.effective.constraints, ["No production writes", "Stay local by default", "Avoid long prose"]);
  assert.equal(result.compact.effective.taskHint, "Focus on the next explicit deliverable.");
});

test("resolveTaskContext tolerates missing structured arrays without inventing values", async () => {
  const { resolveTaskContext } = await loadModule();

  const result = resolveTaskContext({
    workspace: {
      title: "Workspace Alpha",
      summary: "Shared delivery rules",
      principles: "not-an-array",
      constraints: null
    },
    project: {
      bullets: ["One clear bullet"]
    },
    taskHint: null
  });

  assert.deepEqual(result.compact.workspace.principles, []);
  assert.deepEqual(result.compact.workspace.constraints, []);
  assert.deepEqual(result.compact.project.bullets, ["One clear bullet"]);
  assert.deepEqual(result.merged.principles, []);
  assert.deepEqual(result.merged.constraints, []);
  assert.equal(result.compact.effective.taskHint, null);
});
