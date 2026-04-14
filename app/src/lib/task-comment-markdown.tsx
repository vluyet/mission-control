import type { JSX } from "react";

function escapeMentionName(name: string) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

export function renderTaskCommentBody(body: string, mentionSuggestions: string[], commentId: string): JSX.Element[] {
  const lines = body.split("\n");
  const blocks: JSX.Element[] = [];
  let listItems: string[] = [];
  let orderedListItems: string[] = [];

  function flushList(key: string) {
    if (listItems.length) {
      blocks.push(
        <ul className="my-3 list-disc space-y-1 pl-5 marker:text-slate-400" key={`${key}-unordered`}>
          {listItems.map((item, index) => (
            <li key={`${key}-unordered-${index}`}>{renderInlineTaskCommentMarkdown(item, mentionSuggestions, `${commentId}-li-${index}`)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }

    if (orderedListItems.length) {
      blocks.push(
        <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-slate-500" key={`${key}-ordered`}>
          {orderedListItems.map((item, index) => (
            <li key={`${key}-ordered-${index}`}>{renderInlineTaskCommentMarkdown(item, mentionSuggestions, `${commentId}-oli-${index}`)}</li>
          ))}
        </ol>
      );
      orderedListItems = [];
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const orderedListMatch = /^\d+\.\s+(.+)$/.exec(trimmed);

    if (!trimmed) {
      flushList(`${commentId}-list-${index}`);
      blocks.push(<div className="h-3" key={`${commentId}-spacer-${index}`} />);
      return;
    }

    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    if (orderedListMatch) {
      orderedListItems.push(orderedListMatch[1]);
      return;
    }

    flushList(`${commentId}-list-${index}`);
    blocks.push(
      <p className="text-sm leading-7 text-slate-600" key={`${commentId}-p-${index}`}>
        {renderInlineTaskCommentMarkdown(line, mentionSuggestions, `${commentId}-line-${index}`)}
      </p>
    );
  });

  flushList(`${commentId}-list-final`);
  return blocks;
}
