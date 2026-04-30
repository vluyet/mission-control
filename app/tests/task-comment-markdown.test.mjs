import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourcePath = path.join(appDir, "src/lib/markdown.ts");
const parserImportPath = pathToFileURL(path.join(appDir, "node_modules/overtype/src/parser.js")).href;
const outdir = path.resolve("/tmp/mission-control-markdown-tests");

async function loadModule() {
  const source = await fs.readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: sourcePath
  }).outputText;

  const rewritten = transpiled.replace('from "overtype/parser"', `from ${JSON.stringify(parserImportPath)}`);

  await fs.mkdir(outdir, { recursive: true });
  await fs.writeFile(path.join(outdir, "markdown.mjs"), rewritten, "utf8");

  return import(`${pathToFileURL(path.join(outdir, "markdown.mjs")).href}?t=${Date.now()}-${Math.random()}`);
}

test("renderMarkdownHtml removes parser scaffolding while keeping rendered headings, emphasis, and links", async () => {
  const { renderMarkdownHtml } = await loadModule();
  const html = renderMarkdownHtml("# Heading\n\nParagraph with **bold** and [link](https://example.com)");

  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">link<\/a>/);
  assert.doesNotMatch(html, /syntax-marker/);
  assert.doesNotMatch(html, /anchor-name/);
});

test("renderMarkdownHtml drops fence marker lines but preserves code blocks and task lists", async () => {
  const { renderMarkdownHtml } = await loadModule();
  const html = renderMarkdownHtml("```js\nconst value = 1;\n```\n\n- [x] done\n- [ ] todo");

  assert.match(html, /<pre class="code-block"><code class="language-js">const value = 1;<\/code><\/pre>/);
  assert.match(html, /task-list/);
  assert.doesNotMatch(html, /code-fence/);
  assert.doesNotMatch(html, /```/);
});

test("renderMarkdownHtml rewrites paragraph divs into semantic paragraphs without spacer blocks", async () => {
  const { renderMarkdownHtml } = await loadModule();
  const html = renderMarkdownHtml("First paragraph\n\nSecond paragraph");

  assert.equal(html, "<p>First paragraph</p><p>Second paragraph</p>");
  assert.doesNotMatch(html, /&nbsp;/);
  assert.doesNotMatch(html, /<div>/);
});

test("renderMarkdownHtml linkifies bare URLs in regular text while preserving markdown links and code blocks", async () => {
  const { renderMarkdownHtml } = await loadModule();
  const html = renderMarkdownHtml("Visit https://example.com and www.example.com.\n\n```txt\nhttps://internal.example.com\n```\n\n[docs](https://docs.example.com)");

  assert.match(html, /<a href="https:\/\/example.com">https:\/\/example.com<\/a>/);
  assert.match(html, /<a href="https:\/\/www.example.com">www.example.com<\/a>\./);
  assert.match(html, /<a href="https:\/\/docs.example.com">docs<\/a>/);
  assert.match(html, /<pre class="code-block"><code class="language-txt">https:\/\/internal.example.com<\/code><\/pre>/);
});

test("getMarkdownTextPreview strips markdown markers into compact plain-text summaries", async () => {
  const { getMarkdownTextPreview } = await loadModule();
  const preview = getMarkdownTextPreview("# Heading\n\n- [x] **Ship** the `editor`\n- [ ] Review [docs](https://example.com)\n\n> Keep scope small");

  assert.equal(preview, "Heading Ship the editor Review docs Keep scope small");
});
