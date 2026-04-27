import { MarkdownParser } from "overtype/parser";

const CODE_FENCE_LINE_PATTERN = /<div><span class="code-fence">```[^<]*<\/span><\/div>/g;
const SYNTAX_MARKER_PATTERN = /<span class="syntax-marker[^"]*">[\s\S]*?<\/span>/g;
const LINK_ANCHOR_STYLE_PATTERN = /\sstyle="anchor-name:\s*--link-\d+"/g;
const EMPTY_CLASS_PATTERN = /\sclass=""/g;
const EMPTY_PARAGRAPH_DIV_PATTERN = /<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>/g;
const PARAGRAPH_DIV_PATTERN = /<div>([\s\S]*?)<\/div>/g;

function normalizeParagraphBlocks(html: string) {
  return html
    .replace(EMPTY_PARAGRAPH_DIV_PATTERN, "")
    .replace(PARAGRAPH_DIV_PATTERN, "<p>$1</p>");
}

export function renderMarkdownHtml(markdown: string) {
  if (!markdown.trim()) {
    return "";
  }

  return normalizeParagraphBlocks(
    MarkdownParser.parse(markdown, -1, false, undefined, true)
      .replace(CODE_FENCE_LINE_PATTERN, "")
      .replace(SYNTAX_MARKER_PATTERN, "")
      .replace(LINK_ANCHOR_STYLE_PATTERN, "")
      .replace(EMPTY_CLASS_PATTERN, "")
      .replace(/\n/g, "")
  );
}

export function getMarkdownTextPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|\W)(\*|_)([^*_]+)(\2)(?=\W|$)/g, "$1$3")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}