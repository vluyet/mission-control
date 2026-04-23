import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outdir = path.resolve("/tmp/mission-control-task-transition-tests");

async function loadTransitionRules() {
  const sourcePath = path.join(appDir, "src/lib/server/tasks-server.ts");
  const source = await fs.readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(
    `${source}\nexport { getAgentTransitionOptions, getHumanTransitionOptions, isAllowedAgentTransition };\n`,
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      },
      fileName: sourcePath
    }
  ).outputText
    .replace('from "next/headers"', 'from "./stubs/next-headers.mjs"')
    .replace('from "@/lib/db"', 'from "./stubs/db.mjs"')
    .replace('from "@/lib/context-block"', 'from "./stubs/context-block.mjs"')
    .replace('from "@/lib/context-resolver"', 'from "./stubs/context-resolver.mjs"')
    .replace('from "@/lib/i18n/server"', 'from "./stubs/i18n-server.mjs"')
    .replace('from "@/lib/member-display"', 'from "./stubs/member-display.mjs"')
    .replace('from "@/lib/workspace-session"', 'from "./stubs/workspace-session.mjs"');

  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(outdir, "stubs", "next-headers.mjs"),
      'export async function cookies() { return { get() { return undefined; } }; }\n',
      "utf8"
    ),
    fs.writeFile(path.join(outdir, "stubs", "db.mjs"), 'export const db = {};\n', "utf8"),
    fs.writeFile(
      path.join(outdir, "stubs", "context-block.mjs"),
      'export function mapContextBlock(value) { return value ?? null; }\n',
      "utf8"
    ),
    fs.writeFile(
      path.join(outdir, "stubs", "context-resolver.mjs"),
      'export function resolveTaskContext() { return null; }\n',
      "utf8"
    ),
    fs.writeFile(
      path.join(outdir, "stubs", "i18n-server.mjs"),
      'export async function getRequestI18n() { return { t: (key) => key }; }\n',
      "utf8"
    ),
    fs.writeFile(
      path.join(outdir, "stubs", "member-display.mjs"),
      'export function localizeLooseRoleLabel(value) { return value ?? null; }\nexport function localizeSystemMemberName(value) { return value ?? null; }\n',
      "utf8"
    ),
    fs.writeFile(
      path.join(outdir, "stubs", "workspace-session.mjs"),
      'export const ACTIVE_WORKSPACE_COOKIE_NAME = "mission_control_workspace";\nexport const DEFAULT_WORKSPACE_SLUG = "north-star-lab";\n',
      "utf8"
    )
  ]);

  const outPath = path.join(outdir, `task-transitions-${Date.now()}-${Math.random()}.mjs`);
  await fs.writeFile(outPath, transpiled, "utf8");
  return import(`${pathToFileURL(outPath).href}?t=${Date.now()}-${Math.random()}`);
}

function translate(key) {
  return key;
}

test("agent transition options reopen done tasks to todo and in progress", async () => {
  const { getAgentTransitionOptions } = await loadTransitionRules();
  const values = getAgentTransitionOptions("done", translate).map((option) => option.value);

  assert.deepEqual(values, ["todo", "in_progress"]);
});

test("agent transition validation allows reopening done tasks", async () => {
  const { isAllowedAgentTransition } = await loadTransitionRules();

  assert.equal(isAllowedAgentTransition("done", "todo"), true);
  assert.equal(isAllowedAgentTransition("done", "in_progress"), true);
  assert.equal(isAllowedAgentTransition("done", "review"), false);
});

test("human transition options still include todo and in progress from done", async () => {
  const { getHumanTransitionOptions } = await loadTransitionRules();
  const values = getHumanTransitionOptions("done", translate).map((option) => option.value);

  assert.equal(values.includes("todo"), true);
  assert.equal(values.includes("in_progress"), true);
});