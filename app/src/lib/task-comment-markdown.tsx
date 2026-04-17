import type { JSX } from "react";

type ListKind = "unordered" | "ordered" | "checklist";

type ChecklistItem = {
  text: string;
  checked: boolean;
};

const COMMENT_BODY_TEXT_CLASS = "text-sm leading-7 text-slate-600";
const COMMENT_EDITOR_LINE_CLASS = "min-h-[1.75rem] text-sm leading-7 text-slate-900";

type EditorLineAccent = {
  lineClassName?: string;
  prefixText?: string;
  prefixClassName?: string;
  content?: string;
};

function escapeMentionName(name: string) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderEditorSyntaxToken(text: string, key: string, className = "text-slate-300") {
  return <span className={className} key={key}>{text}</span>;
}

export function renderInlineTaskCommentMarkdown(text: string, mentionSuggestions: string[], keyPrefix: string): JSX.Element[] {
  const mentionPattern = mentionSuggestions.length
    ? new RegExp(
        `(^|\\s)@(${mentionSuggestions.map(escapeMentionName).sort((a, b) => b.length - a.length).join("|")})(?=$|[^A-Za-z0-9._:-])`,
        "g"
      )
    : null;

  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|https?:\/\/\S+|@[A-Za-z0-9][A-Za-z0-9._:-]*)/g);

  return parts.filter(Boolean).flatMap((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong className="font-semibold text-slate-900" key={`${keyPrefix}-strong-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em className="italic text-slate-700" key={`${keyPrefix}-em-${index}`}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.82em] text-slate-800" key={`${keyPrefix}-code-${index}`}>{part.slice(1, -1)}</code>;
    }

    if (/^https?:\/\/\S+$/.test(part)) {
      return (
        <a
          href={part}
          key={`${keyPrefix}-link-${index}`}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-700 underline underline-offset-2 hover:text-sky-800"
        >
          {part}
        </a>
      );
    }

    if (mentionPattern && /@[A-Za-z0-9][A-Za-z0-9._:-]*/.test(part)) {
      return part.split(mentionPattern).filter(Boolean).map((chunk, chunkIndex) => {
        if (mentionSuggestions.includes(chunk)) {
          return (
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.78rem] font-semibold text-blue-700" key={`${keyPrefix}-mention-${index}-${chunkIndex}`}>
              @{chunk}
            </span>
          );
        }

        if (chunk.startsWith("@") && mentionSuggestions.includes(chunk.slice(1))) {
          return (
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.78rem] font-semibold text-blue-700" key={`${keyPrefix}-mention-token-${index}-${chunkIndex}`}>
              {chunk}
            </span>
          );
        }

        return <span key={`${keyPrefix}-text-${index}-${chunkIndex}`}>{chunk}</span>;
      });
    }

    if (part.startsWith("@") && mentionSuggestions.includes(part.slice(1))) {
      return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.78rem] font-semibold text-blue-700" key={`${keyPrefix}-mention-${index}`}>
          {part}
        </span>
      );
    }

    return <span key={`${keyPrefix}-plain-${index}`}>{part}</span>;
  });
}

function renderTaskCommentEditorInlineHighlight(text: string, mentionSuggestions: string[], keyPrefix: string): JSX.Element[] {
  const exactMentions = new Set(mentionSuggestions.map((name) => name.toLowerCase()));
  const parts = text.split(/(\*\*[^*\n]+\*\*|_[^_\n]+_|`[^`\n]+`|https?:\/\/\S+|@[A-Za-z0-9][A-Za-z0-9._:-]*)/g);

  return parts.filter(Boolean).flatMap((part, index) => {
    const strongMatch = /^\*\*([^*\n]+)\*\*$/.exec(part);
    if (strongMatch) {
      return [
        renderEditorSyntaxToken("**", `${keyPrefix}-strong-open-${index}`),
        <span className="text-slate-950 [text-shadow:0.02em_0_currentColor]" key={`${keyPrefix}-strong-content-${index}`}>
          {strongMatch[1]}
        </span>,
        renderEditorSyntaxToken("**", `${keyPrefix}-strong-close-${index}`)
      ];
    }

    const italicMatch = /^_([^_\n]+)_$/.exec(part);
    if (italicMatch) {
      return [
        renderEditorSyntaxToken("_", `${keyPrefix}-em-open-${index}`),
        <span className="inline-block -skew-x-12 text-slate-800" key={`${keyPrefix}-em-content-${index}`}>
          {italicMatch[1]}
        </span>,
        renderEditorSyntaxToken("_", `${keyPrefix}-em-close-${index}`)
      ];
    }

    const inlineCodeMatch = /^`([^`\n]+)`$/.exec(part);
    if (inlineCodeMatch) {
      return [
        renderEditorSyntaxToken("`", `${keyPrefix}-code-open-${index}`),
        <code className="rounded bg-slate-100 text-slate-900 [box-shadow:inset_0_0_0_1px_rgba(148,163,184,0.22)]" key={`${keyPrefix}-code-content-${index}`}>
          {inlineCodeMatch[1]}
        </code>,
        renderEditorSyntaxToken("`", `${keyPrefix}-code-close-${index}`)
      ];
    }

    if (/^https?:\/\/\S+$/.test(part)) {
      return [
        <span className="text-sky-700 underline decoration-sky-400 underline-offset-2" key={`${keyPrefix}-link-token-${index}`}>
          {part}
        </span>
      ];
    }

    if (part.startsWith("@")) {
      const normalized = part.slice(1).toLowerCase();
      const isExactMention = exactMentions.has(normalized);
      const isPartialMention = mentionSuggestions.some((name) => name.toLowerCase().startsWith(normalized));

      return [
        <span
          className={
            isExactMention
              ? "rounded bg-blue-100/80 text-blue-800 [box-shadow:inset_0_0_0_1px_rgba(59,130,246,0.22)]"
              : isPartialMention
                ? "rounded bg-blue-50/85 text-blue-700 [box-shadow:inset_0_0_0_1px_rgba(96,165,250,0.18)]"
                : "rounded bg-slate-100 text-slate-700 [box-shadow:inset_0_0_0_1px_rgba(148,163,184,0.18)]"
          }
          key={`${keyPrefix}-mention-token-${index}`}
        >
          {part}
        </span>
      ];
    }

    return [<span key={`${keyPrefix}-plain-${index}`}>{part}</span>];
  });
}

function getTaskCommentEditorLineAccent(line: string, inCodeFence: boolean): EditorLineAccent {
  const trimmed = line.trim();

  if (inCodeFence || /^```\s*([A-Za-z0-9_-]+)?\s*$/.test(trimmed)) {
    return {
      lineClassName: "rounded-md bg-slate-100 text-slate-900"
    };
  }

  const headingMatch = /^(#{1,6})(\s+)(.*)$/.exec(line);
  if (headingMatch) {
    return {
      lineClassName:
        headingMatch[1].length === 1
          ? "rounded-md bg-amber-50/60 text-slate-950 [text-shadow:0.02em_0_currentColor]"
          : headingMatch[1].length === 2
            ? "rounded-md bg-amber-50/45 text-slate-950 [text-shadow:0.015em_0_currentColor]"
            : "rounded-md bg-amber-50/25 text-slate-900",
      prefixText: `${headingMatch[1]}${headingMatch[2]}`,
      prefixClassName: "text-amber-300",
      content: headingMatch[3]
    };
  }

  const checklistMatch = /^([-*]\s+\[(x|X| )\]\s+)(.*)$/.exec(line);
  if (checklistMatch) {
    return {
      lineClassName: checklistMatch[2].toLowerCase() === "x" ? "rounded-md bg-emerald-50/60 text-slate-900" : "rounded-md bg-slate-50 text-slate-900",
      prefixText: checklistMatch[1],
      prefixClassName: checklistMatch[2].toLowerCase() === "x" ? "text-emerald-300" : "text-slate-300",
      content: checklistMatch[3]
    };
  }

  const unorderedListMatch = /^([-*]\s+)(.*)$/.exec(line);
  if (unorderedListMatch) {
    return {
      lineClassName: "text-slate-900",
      prefixText: unorderedListMatch[1],
      prefixClassName: "text-slate-300",
      content: unorderedListMatch[2]
    };
  }

  const orderedListMatch = /^(\d+\.\s+)(.*)$/.exec(line);
  if (orderedListMatch) {
    return {
      lineClassName: "text-slate-900",
      prefixText: orderedListMatch[1],
      prefixClassName: "text-slate-300",
      content: orderedListMatch[2]
    };
  }

  const blockquoteMatch = /^(>\s+)(.*)$/.exec(line);
  if (blockquoteMatch) {
    return {
      lineClassName: "rounded-md bg-slate-50/70 text-slate-700",
      prefixText: blockquoteMatch[1],
      prefixClassName: "text-slate-300",
      content: blockquoteMatch[2]
    };
  }

  return { content: line };
}

export function renderTaskCommentEditorHighlight(body: string, mentionSuggestions: string[], keyPrefix: string): JSX.Element[] {
  const lines = body.split("\n");
  let inCodeFence = false;

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isFenceLine = /^```\s*([A-Za-z0-9_-]+)?\s*$/.test(trimmed);
    const isCodeLine = inCodeFence || isFenceLine;
    const accent = getTaskCommentEditorLineAccent(line, inCodeFence);
    const content = (accent.content ?? line) || "\u00a0";

    if (isFenceLine) {
      inCodeFence = !inCodeFence;
    }

    return (
      <div className={`${COMMENT_EDITOR_LINE_CLASS} ${accent.lineClassName ?? ""}`.trim()} key={`${keyPrefix}-line-${index}`}>
        {accent.prefixText ? <span className={accent.prefixClassName}>{accent.prefixText}</span> : null}
        {isCodeLine ? <span>{content}</span> : renderTaskCommentEditorInlineHighlight(content, mentionSuggestions, `${keyPrefix}-inline-${index}`)}
      </div>
    );
  });
}

export function renderTaskCommentBody(body: string, mentionSuggestions: string[], commentId: string): JSX.Element[] {
  const lines = body.split("\n");
  const blocks: JSX.Element[] = [];
  let listKind: ListKind | null = null;
  let listItems: string[] = [];
  let checklistItems: ChecklistItem[] = [];
  let codeFenceLanguage: string | null = null;
  let codeFenceLines: string[] = [];

  function flushList(key: string) {
    if (listKind === "unordered" && listItems.length) {
      blocks.push(
        <ul className={`my-3 list-disc space-y-1 pl-5 ${COMMENT_BODY_TEXT_CLASS} marker:text-slate-400`} key={`${key}-unordered`}>
          {listItems.map((item, index) => (
            <li key={`${key}-unordered-${index}`}>{renderInlineTaskCommentMarkdown(item, mentionSuggestions, `${commentId}-li-${index}`)}</li>
          ))}
        </ul>
      );
    }

    if (listKind === "ordered" && listItems.length) {
      blocks.push(
        <ol className={`my-3 list-decimal space-y-1 pl-5 ${COMMENT_BODY_TEXT_CLASS} marker:text-slate-500`} key={`${key}-ordered`}>
          {listItems.map((item, index) => (
            <li key={`${key}-ordered-${index}`}>{renderInlineTaskCommentMarkdown(item, mentionSuggestions, `${commentId}-oli-${index}`)}</li>
          ))}
        </ol>
      );
    }

    if (listKind === "checklist" && checklistItems.length) {
      blocks.push(
        <ul className="my-3 space-y-1.5 pl-0" key={`${key}-checklist`}>
          {checklistItems.map((item, index) => (
            <li className={`flex items-start gap-2 ${COMMENT_BODY_TEXT_CLASS}`} key={`${key}-checklist-${index}`}>
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[0.75rem] font-semibold ${item.checked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-400"}`}>
                {item.checked ? "✓" : ""}
              </span>
              <span>{renderInlineTaskCommentMarkdown(item.text, mentionSuggestions, `${commentId}-check-${index}`)}</span>
            </li>
          ))}
        </ul>
      );
    }

    listKind = null;
    listItems = [];
    checklistItems = [];
  }

  function flushCodeFence(key: string) {
    if (!codeFenceLines.length && codeFenceLanguage == null) return;

    blocks.push(
      <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950" key={`${key}-codeblock`}>
        {codeFenceLanguage ? (
          <div className="border-b border-slate-800 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {codeFenceLanguage}
          </div>
        ) : null}
        <pre className="overflow-x-auto px-4 py-3 text-[0.82rem] leading-6 text-slate-100">
          <code>{codeFenceLines.join("\n")}</code>
        </pre>
      </div>
    );

    codeFenceLanguage = null;
    codeFenceLines = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const fenceMatch = /^```\s*([A-Za-z0-9_-]+)?\s*$/.exec(trimmed);

    if (codeFenceLanguage !== null) {
      if (fenceMatch) {
        flushCodeFence(`${commentId}-code-${index}`);
      } else {
        codeFenceLines.push(line);
      }
      return;
    }

    if (fenceMatch) {
      flushList(`${commentId}-list-${index}`);
      codeFenceLanguage = fenceMatch[1] ?? "";
      codeFenceLines = [];
      return;
    }

    const checklistMatch = /^[-*]\s+\[(x|X| )\]\s+(.+)$/.exec(trimmed);
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const orderedListMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);

    if (!trimmed) {
      flushList(`${commentId}-list-${index}`);
      blocks.push(<div className="h-3" key={`${commentId}-spacer-${index}`} />);
      return;
    }

    if (checklistMatch) {
      if (listKind !== "checklist") {
        flushList(`${commentId}-list-${index}`);
        listKind = "checklist";
      }
      checklistItems.push({ text: checklistMatch[2], checked: checklistMatch[1].toLowerCase() === "x" });
      return;
    }

    if (listMatch) {
      if (listKind !== "unordered") {
        flushList(`${commentId}-list-${index}`);
        listKind = "unordered";
      }
      listItems.push(listMatch[1]);
      return;
    }

    if (orderedListMatch) {
      if (listKind !== "ordered") {
        flushList(`${commentId}-list-${index}`);
        listKind = "ordered";
      }
      listItems.push(orderedListMatch[1]);
      return;
    }

    flushList(`${commentId}-list-${index}`);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const className =
        level === 1
          ? "mt-1 text-base font-semibold tracking-tight text-slate-900"
          : level === 2
            ? "mt-1 text-sm font-semibold tracking-tight text-slate-900"
            : "mt-1 text-sm font-semibold text-slate-800";

      blocks.push(
        <p className={className} key={`${commentId}-h-${index}`}>
          {renderInlineTaskCommentMarkdown(headingMatch[2], mentionSuggestions, `${commentId}-heading-${index}`)}
        </p>
      );
      return;
    }

    blocks.push(
      <p className={COMMENT_BODY_TEXT_CLASS} key={`${commentId}-p-${index}`}>
        {renderInlineTaskCommentMarkdown(line, mentionSuggestions, `${commentId}-line-${index}`)}
      </p>
    );
  });

  flushList(`${commentId}-list-final`);
  flushCodeFence(`${commentId}-code-final`);
  return blocks;
}
