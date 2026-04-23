import { renderMarkdownHtml } from "@/lib/markdown";

export function MarkdownContent({
  markdown,
  className,
  testId
}: {
  markdown: string;
  className?: string;
  testId?: string;
}) {
  const html = renderMarkdownHtml(markdown);

  if (!html) {
    return null;
  }

  return (
    <div
      className={["markdown-rendered", className].filter(Boolean).join(" ")}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}