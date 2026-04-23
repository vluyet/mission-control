import { MarkdownParser } from "overtype/parser";

const CODE_FENCE_LINE_PATTERN = /<div><span class="code-fence">```[^<]*<\/span><\/div>/g;
const SYNTAX_MARKER_PATTERN = /<span class="syntax-marker[^"]*">[\s\S]*?<\/span>/g;
const LINK_ANCHOR_STYLE_PATTERN = /\sstyle="anchor-name:\s*--link-\d+"/g;
const EMPTY_CLASS_PATTERN = /\sclass=""/g;

export function renderMarkdownHtml(markdown: string) {
  if (!markdown.trim()) {
    return "";
  }

  return MarkdownParser.parse(markdown, -1, false, undefined, true)
    .replace(CODE_FENCE_LINE_PATTERN, "")
    .replace(SYNTAX_MARKER_PATTERN, "")
    .replace(LINK_ANCHOR_STYLE_PATTERN, "")
    .replace(EMPTY_CLASS_PATTERN, "");
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