import type { JSX } from "react";

type ListKind = "unordered" | "ordered" | "checklist";

type ChecklistItem = {
  text: string;
  checked: boolean;
};

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
  let listKind: ListKind | null = null;
  let listItems: string[] = [];
  let checklistItems: ChecklistItem[] = [];
  let codeFenceLanguage: string | null = null;
  let codeFenceLines: string[] = [];

  function flushList(key: string) {
    if (listKind === "unordered" && listItems.length) {
      blocks.push(
        <ul className="my-3 list-disc space-y-1 pl-5 marker:text-slate-400" key={`${key}-unordered`}>
          {listItems.map((item, index) => (
            <li key={`${key}-unordered-${index}`}>{renderInlineTaskCommentMarkdown(item, mentionSuggestions, `${commentId}-li-${index}`)}</li>
          ))}
        </ul>
      );
    }

    if (listKind === "ordered" && listItems.length) {
      blocks.push(
        <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-slate-500" key={`${key}-ordered`}>
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
            <li className="flex items-start gap-2 text-sm leading-6 text-slate-600" key={`${key}-checklist-${index}`}>
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
      <p className="text-sm leading-7 text-slate-600" key={`${commentId}-p-${index}`}>
        {renderInlineTaskCommentMarkdown(line, mentionSuggestions, `${commentId}-line-${index}`)}
      </p>
    );
  });

  flushList(`${commentId}-list-final`);
  flushCodeFence(`${commentId}-code-final`);
  return blocks;
}
