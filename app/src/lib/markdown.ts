import { MarkdownParser } from "overtype/parser";

const CODE_FENCE_LINE_PATTERN = /<div><span class="code-fence">```[^<]*<\/span><\/div>/g;
const SYNTAX_MARKER_PATTERN = /<span class="syntax-marker[^"]*">[\s\S]*?<\/span>/g;
const LINK_ANCHOR_STYLE_PATTERN = /\sstyle="anchor-name:\s*--link-\d+"/g;
const EMPTY_CLASS_PATTERN = /\sclass=""/g;
const EMPTY_PARAGRAPH_DIV_PATTERN = /<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>/g;
const PARAGRAPH_DIV_PATTERN = /<div>([\s\S]*?)<\/div>/g;
const HTML_TAG_SPLIT_PATTERN = /(<[^>]+>)/g;
const BARE_URL_PATTERN = /(^|[\s(])((?:https?:\/\/|www\.)[^\s<]+)/g;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.;!?]+$/;

function normalizeParagraphBlocks(html: string) {
  return html
    .replace(EMPTY_PARAGRAPH_DIV_PATTERN, "")
    .replace(PARAGRAPH_DIV_PATTERN, "<p>$1</p>");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeUrlHref(url: string) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

function trackTagDepth(segment: string, tagName: string, currentDepth: number) {
  const openTagPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "gi");
  const closeTagPattern = new RegExp(`</${tagName}>`, "gi");
  const opens = segment.match(openTagPattern)?.length ?? 0;
  const closes = segment.match(closeTagPattern)?.length ?? 0;
  return Math.max(0, currentDepth + opens - closes);
}

function linkifyTextSegment(segment: string) {
  return segment.replace(BARE_URL_PATTERN, (match, prefix: string, rawUrl: string) => {
    const trailingPunctuation = rawUrl.match(TRAILING_URL_PUNCTUATION_PATTERN)?.[0] ?? "";
    const cleanUrl = trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation.length) : rawUrl;

    if (!cleanUrl) {
      return match;
    }

    const href = escapeHtmlAttribute(normalizeUrlHref(cleanUrl));
    return `${prefix}<a href="${href}">${cleanUrl}</a>${trailingPunctuation}`;
  });
}

function linkifyRenderedHtml(html: string) {
  let anchorDepth = 0;
  let codeDepth = 0;
  let preDepth = 0;

  return html
    .split(HTML_TAG_SPLIT_PATTERN)
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      if (segment.startsWith("<")) {
        anchorDepth = trackTagDepth(segment, "a", anchorDepth);
        codeDepth = trackTagDepth(segment, "code", codeDepth);
        preDepth = trackTagDepth(segment, "pre", preDepth);
        return segment;
      }

      if (anchorDepth > 0 || codeDepth > 0 || preDepth > 0) {
        return segment;
      }

      return linkifyTextSegment(segment);
    })
    .join("");
}

export function renderMarkdownHtml(markdown: string) {
  if (!markdown.trim()) {
    return "";
  }

  return linkifyRenderedHtml(
    normalizeParagraphBlocks(
      MarkdownParser.parse(markdown, -1, false, undefined, true)
        .replace(CODE_FENCE_LINE_PATTERN, "")
        .replace(SYNTAX_MARKER_PATTERN, "")
        .replace(LINK_ANCHOR_STYLE_PATTERN, "")
        .replace(EMPTY_CLASS_PATTERN, "")
        .replace(/\n/g, "")
    )
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