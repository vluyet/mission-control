import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = path.join(appDir, "src/lib/constructor.ts");
const outdir = path.resolve("/tmp/mission-control-constructor-file-normalization-tests");

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
  await fs.writeFile(path.join(outdir, "constructor.mjs"), transpiled, "utf8");

  return import(`${pathToFileURL(path.join(outdir, "constructor.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

test("fetchConstructorTaskFiles preserves numeric upstream file ids", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        items: [
          {
            id: 3,
            role: "input",
            active: true,
            fileName: "doc-test_nova.txt",
            mediaType: "text/plain",
            sizeBytes: 28,
            creatorExecutionId: null,
            createdAt: "2026-04-28T11:42:50.099Z",
            updatedAt: "2026-04-28T11:42:50.099Z"
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const { fetchConstructorTaskFiles } = await loadModule();
    const result = await fetchConstructorTaskFiles({
      baseUrl: "http://127.0.0.1:8787",
      apiToken: "constructor-token",
      externalTaskId: "mc-task-PROJET-T-017"
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, "3");
    assert.equal(result.items[0].fileName, "doc-test_nova.txt");
    assert.equal(result.items[0].kind, "input");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uploadConstructorTaskFile preserves numeric upstream file ids", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        item: {
          id: 4,
          role: "input",
          active: true,
          fileName: "minergie.ch.pdf",
          mediaType: "application/pdf",
          sizeBytes: 286734,
          creatorExecutionId: null,
          createdAt: "2026-04-28T11:48:30.574Z",
          updatedAt: "2026-04-28T11:48:30.574Z"
        }
      }),
      { status: 201, headers: { "content-type": "application/json" } }
    );

  try {
    const { uploadConstructorTaskFile } = await loadModule();
    const result = await uploadConstructorTaskFile({
      baseUrl: "http://127.0.0.1:8787",
      apiToken: "constructor-token",
      externalTaskId: "mc-task-PROJET-T-017",
      body: {
        fileName: "minergie.ch.pdf",
        contentBase64: Buffer.from("pdf-bytes").toString("base64"),
        contentType: "application/pdf"
      }
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.item?.id, "4");
    assert.equal(result.item?.fileName, "minergie.ch.pdf");
    assert.equal(result.item?.kind, "input");
  } finally {
    globalThis.fetch = originalFetch;
  }
});