import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outdir = path.resolve("/tmp/mission-control-context-block-contract-tests");

async function loadMapContextBlock() {
  const sourcePath = path.join(appDir, "src/lib/context-block.ts");
  const source = await fs.readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(`${source}\nexport { mapContextBlock };\n`, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: sourcePath
  }).outputText;

  await fs.mkdir(outdir, { recursive: true });
  const outPath = path.join(outdir, `context-block-${Date.now()}-${Math.random()}.mjs`);
  await fs.writeFile(outPath, transpiled, "utf8");
  return import(pathToFileURL(outPath).href);
}

const serverFiles = [
  "src/lib/server-data.ts",
  "src/lib/server/projects-server.ts",
  "src/lib/server/workspace-server.ts",
  "src/lib/server/tasks-server.ts"
];

test("shared mapContextBlock keeps only title, summary, and bullets", async () => {
  const { mapContextBlock } = await loadMapContextBlock();
  const result = mapContextBlock(
    {
      title: "Context title",
      summary: "Compact summary",
      bullets: ["Keep updates concise", "", "Respect approvals", 42],
      principles: ["Prefer reversible changes"],
      constraints: ["Stay local by default"],
      taskHint: "Revise the existing draft"
    },
    "Fallback title"
  );

  assert.deepEqual(result, {
    title: "Context title",
    summary: "Compact summary",
    bullets: ["Keep updates concise", "Respect approvals"]
  });
  assert.equal("principles" in result, false);
  assert.equal("constraints" in result, false);
  assert.equal("taskHint" in result, false);
});

for (const relativePath of serverFiles) {
  test(`${relativePath} imports the shared mapContextBlock helper`, async () => {
    const source = await fs.readFile(path.join(appDir, relativePath), "utf8");
    assert.match(source, /import\s*\{\s*mapContextBlock\s*\}\s*from\s*["']@\/lib\/context-block["']/);
    assert.doesNotMatch(source, /function\s+mapContextBlock\s*\(/);
  });
}
