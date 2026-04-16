"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { DotsIcon } from "@/components/ui/icons";
import { AppButton, Panel, PanelHeader, PriorityBadge } from "@/components/ui/primitives";

type BoardCard = {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  eta: string;
  effort: string;
  project: string;
  tags?: string[];
  childCount?: number;
  parentTaskTitle?: string | null;
};

type BoardColumn = {
  title: string;
  statusKey?: "todo" | "inProgress" | "inReview" | "blocked" | "done";
  count: number;
  accent: "slate" | "blue" | "gold" | "red" | "emerald";
  cards: BoardCard[];
};

const STATUS_MAP: Record<NonNullable<BoardColumn["statusKey"]>, "todo" | "in_progress" | "review" | "blocked" | "done"> = {
  todo: "todo",
  inProgress: "in_progress",
  inReview: "review",
  blocked: "blocked",
  done: "done"
};

function getStatusLabel(column: BoardColumn, t: (key: string) => string) {
  switch (column.statusKey) {
    case "inProgress":
      return t("taskStatus.inProgress");
    case "inReview":
      return t("taskStatus.inReview");
    case "blocked":
      return t("taskStatus.blocked");
    case "done":
      return t("taskStatus.done");
    default:
      return t("taskStatus.todo");
  }
}

function recount(columns: BoardColumn[]) {
  return columns.map((column) => ({
    ...column,
    count: column.cards.length
  }));
}

export function BoardGridInteractive({
  columns,
  title,
  description
}: {
  columns: BoardColumn[];
  title: string;
  description?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [boardColumns, setBoardColumns] = useState(columns);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTitle, setDropTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEmptyBoard = boardColumns.every((column) => column.cards.length === 0);

  function moveCard(nextColumns: BoardColumn[], cardId: string, targetTitle: string) {
    let movedCard: BoardCard | null = null;

    const withoutCard = nextColumns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        if (card.id === cardId) {
          movedCard = card;
          return false;
        }
        return true;
      })
    }));

    if (!movedCard) {
      return nextColumns;
    }

    return recount(
      withoutCard.map((column) =>
        column.title === targetTitle
          ? {
              ...column,
              cards: [movedCard as BoardCard, ...column.cards]
            }
          : column
      )
    );
  }

  async function handleDrop(targetTitle: string, targetStatusKey?: BoardColumn["statusKey"]) {
    if (!draggedCardId || !targetStatusKey || !STATUS_MAP[targetStatusKey]) {
      return;
    }

    const previous = boardColumns;
    const next = moveCard(previous, draggedCardId, targetTitle);
    setBoardColumns(next);
    setDropTitle(null);
    setDraggedCardId(null);
    setError(null);

    const response = await fetch(`/api/tasks/${draggedCardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: STATUS_MAP[targetStatusKey],
        actorType: "human"
      })
    });

    if (!response.ok) {
      setBoardColumns(previous);
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? t("boardGridInteractive.moveFailed"));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow={t("boardGridInteractive.eyebrow")}
        title={title}
        description={description}
        action={<AppButton tone="secondary">{isPending ? t("boardGridInteractive.syncing") : t("boardGridInteractive.live")}</AppButton>}
      />
      <div className="board-scroll">
        {isEmptyBoard ? (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--text-dim)]">
            {t("boardGridInteractive.empty")}
          </div>
        ) : null}
        {boardColumns.map((column) => (
          <div
            key={column.title}
            className={`board-column ${dropTitle === column.title ? "ring-2 ring-[var(--accent-strong)] ring-inset" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTitle(column.title);
            }}
            onDragLeave={() => setDropTitle((current) => (current === column.title ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              void handleDrop(column.title, column.statusKey);
            }}
          >
            <div className="board-column-header">
              <div className="flex items-center gap-3">
                <span className={`status-dot status-dot-${column.accent}`} />
                <h3 className="text-sm font-semibold text-[var(--text-strong)]">{getStatusLabel(column, t)}</h3>
              </div>
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs text-[var(--text-dim)]">
                {column.count}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDraggedCardId(card.id)}
                  onDragEnd={() => {
                    setDraggedCardId(null);
                    setDropTitle(null);
                  }}
                  className={`board-card cursor-grab ${draggedCardId === card.id ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge value={card.priority} />
                        <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-dim)]">
                          {t("boardGridInteractive.due", { value: card.eta })}
                        </span>
                        {card.childCount ? (
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-dim)]">
                            {t("boardGridInteractive.subtasks", { count: card.childCount })}
                          </span>
                        ) : null}
                      </div>
                      <Link href={`/tasks/${card.id}`} className="block text-sm font-semibold leading-6 text-[var(--text-strong)] hover:text-[var(--accent-strong)]">
                        {card.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                        <span>{card.assignee}</span>
                        {card.parentTaskTitle ? <span>• {t("boardGridInteractive.subtaskOf", { title: card.parentTaskTitle })}</span> : null}
                      </div>
                    </div>
                    <span className="text-[var(--text-dim)]">
                      <DotsIcon className="h-4 w-4" />
                    </span>
                  </div>
                  {card.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[11px] text-[var(--text-dim)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="avatar-chip">{card.assignee.slice(0, 2)}</span>
                      <div className="min-w-0">
                        <div className="truncate text-sm text-[var(--text-muted)]">{card.assignee}</div>
                        <div className="truncate text-[11px] text-[var(--text-dim)]">{card.project}</div>
                      </div>
                    </div>
                    <span className="drag-pill">{t("boardGridInteractive.drag")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error ? <div className="border-t border-[var(--line)] px-5 py-3 text-sm text-rose-600">{error}</div> : null}
    </Panel>
  );
}
