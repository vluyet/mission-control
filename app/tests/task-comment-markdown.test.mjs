import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import React from "react";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = path.join(appDir, "src/lib/task-comment-markdown.tsx");
const outdir = path.resolve("/tmp/mission-control-task-comment-markdown-tests");

function getProps(node) {
  return node?.props ?? {};
}

function getType(node) {
  return node?.type ?? null;
}

function flattenText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  return flattenText(getProps(node).children ?? "");
}

async function loadModule() {
  const source = await fs.readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: sourcePath
  }).outputText;

  const rewritten = transpiled
    .replace('from "react/jsx-runtime"', 'from "./stubs/react-jsx-runtime.mjs"')
    .replace('from "react"', 'from "./stubs/react.mjs"');

  await fs.mkdir(path.join(outdir, "stubs"), { recursive: true });
  await fs.writeFile(path.join(outdir, "task-comment-markdown.mjs"), rewritten, "utf8");
  await fs.writeFile(
    path.join(outdir, "stubs", "react.mjs"),
    'const React = globalThis.__taskCommentMarkdownReact; export default React; export const Fragment = React.Fragment;\n',
    "utf8"
  );
  await fs.writeFile(
    path.join(outdir, "stubs", "react-jsx-runtime.mjs"),
    'const React = globalThis.__taskCommentMarkdownReact;\n' +
      'export const Fragment = React.Fragment;\n' +
      'export function jsx(type, props, key) { return React.createElement(type, key == null ? props : { ...props, key }); }\n' +
      'export function jsxs(type, props, key) { return React.createElement(type, key == null ? props : { ...props, key }); }\n',
    "utf8"
  );

  globalThis.__taskCommentMarkdownReact = React;
  return import(`${pathToFileURL(path.join(outdir, "task-comment-markdown.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

test("renderInlineTaskCommentMarkdown highlights supported mentions without swallowing nearby text", async () => {
  const { renderInlineTaskCommentMarkdown } = await loadModule();
  const nodes = renderInlineTaskCommentMarkdown("Ping @Echo and @Design.Bot today", ["Echo", "Design.Bot"], "inline");

  const mentionNodes = nodes.filter((node) => getType(node) === "span" && String(getProps(node).className ?? "").includes("bg-blue-50"));
  assert.equal(mentionNodes.length, 2);
  assert.equal(nodes.map(flattenText).join(""), "Ping @Echo and @Design.Bot today");
});

test("renderInlineTaskCommentMarkdown renders bold, italic, code, and links", async () => {
  const { renderInlineTaskCommentMarkdown } = await loadModule();
  const nodes = renderInlineTaskCommentMarkdown("Use **bold**, _italic_, `code`, and https://example.com", ["Echo"], "format");

  assert.ok(nodes.some((node) => getType(node) === "strong"));
  assert.ok(nodes.some((node) => getType(node) === "em"));
  assert.ok(nodes.some((node) => getType(node) === "code"));
  const linkNode = nodes.find((node) => getType(node) === "a");
  assert.equal(getProps(linkNode).href, "https://example.com");
  assert.equal(nodes.map(flattenText).join(""), "Use bold, italic, code, and https://example.com");
});

test("renderTaskCommentBody groups unordered lists, ordered lists, paragraphs, and spacers", async () => {
  const { renderTaskCommentBody } = await loadModule();
  const blocks = renderTaskCommentBody(
    "Intro line\n\n- first\n- second\n\n1. alpha\n2. beta\n\nFinal `note` for @Echo",
    ["Echo"],
    "comment-1"
  );

  assert.equal(getType(blocks[0]), "p");
  assert.equal(getType(blocks[1]), "div");
  assert.equal(getType(blocks[2]), "ul");
  assert.deepEqual(getProps(blocks[2]).children.map(flattenText), ["first", "second"]);
  assert.equal(getType(blocks[4]), "ol");
  assert.deepEqual(getProps(blocks[4]).children.map(flattenText), ["alpha", "beta"]);
  assert.equal(getType(blocks.at(-1)), "p");
  assert.equal(blocks.map(flattenText).join(""), "Intro linefirstsecondalphabetaFinal note for @Echo");
});

test("renderTaskCommentBody renders OpenClaw-style headings, checklists, fenced code blocks, and inline code", async () => {
  const { renderTaskCommentBody } = await loadModule();
  const blocks = renderTaskCommentBody(
    "🎉✨🚀🛠️📌\n\n# Test task\n\nThis is a simple markdown-formatted response for Mission Control.\n\n## Example checklist\n\n- [x] Emoji parade included\n- [x] Markdown formatting included\n- [x] Scope kept simple\n\n## Example code\n\n```js\nconst status = \"ok\";\nconsole.log(`Task status: ${status}`);\n```\n\n## Note\n\n`Projet test` currently has minimal context, so this response stays explicit and lightweight.",
    ["Echo"],
    "comment-echo"
  );

  assert.equal(flattenText(blocks[0]), "🎉✨🚀🛠️📌");
  assert.equal(flattenText(blocks[2]), "Test task");
  assert.equal(flattenText(blocks[6]), "Example checklist");
  assert.equal(getType(blocks[8]), "ul");
  assert.deepEqual(getProps(blocks[8]).children.map(flattenText), [
    "✓Emoji parade included",
    "✓Markdown formatting included",
    "✓Scope kept simple"
  ]);
  assert.equal(flattenText(blocks[10]), "Example code");
  assert.equal(getType(blocks[12]), "div");
  assert.ok(flattenText(blocks[12]).includes('const status = "ok";'));
  assert.ok(flattenText(blocks[12]).includes('console.log(`Task status: ${status}`);'));
  assert.equal(flattenText(blocks[14]), "Note");
  assert.ok(flattenText(blocks[16]).includes("Projet test currently has minimal context"));
});
