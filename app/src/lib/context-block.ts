import type { ContextBlock } from "@/lib/demo-data";

export function mapContextBlock(value: unknown, fallbackTitle: string): ContextBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: fallbackTitle, summary: "", bullets: [] };
  }

  const record = value as Record<string, unknown>;
  return {
    title: typeof record.title === "string" && record.title.trim() ? record.title : fallbackTitle,
    summary: typeof record.summary === "string" ? record.summary : "",
    bullets: Array.isArray(record.bullets)
      ? record.bullets.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  };
}
