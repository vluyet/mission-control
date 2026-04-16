import Link from "next/link";
import { ReactNode } from "react";
import { useI18n } from "@/components/product/i18n-provider";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "subtle" | "dark";
};

export function Panel({ children, className, tone = "default" }: PanelProps) {
  return (
    <section
      className={cn(
        "panel-surface rounded-3xl",
        tone === "subtle" && "panel-subtle",
        tone === "dark" && "panel-dark text-white",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--text-strong)]">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AppButton({
  children,
  className,
  tone = "primary",
  href,
  type = "button",
  disabled = false,
  onClick
}: {
  children: ReactNode;
  className?: string;
  tone?: "primary" | "ghost" | "secondary";
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const buttonClassName = cn(
    "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-55",
    tone === "primary" && "bg-[var(--accent-strong)] text-white hover:bg-[#29479f]",
    tone === "secondary" &&
      "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--text-strong)] hover:bg-[var(--surface-hover)]",
    tone === "ghost" && "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={buttonClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={buttonClassName} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function FilterChip({
  label,
  active = false
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text-strong)]"
      )}
    >
      {label}
    </button>
  );
}

export function SegmentedTabs({
  tabs
}: {
  tabs: { label: string; active?: boolean }[];
}) {
  return (
    <div className="inline-flex rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          type="button"
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium transition",
            tab.active
              ? "bg-[var(--surface)] text-[var(--text-strong)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    Todo: "bg-slate-100 text-slate-700 border-slate-200",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    "In Review": "bg-amber-50 text-amber-700 border-amber-200",
    Blocked: "bg-rose-50 text-rose-700 border-rose-200",
    Done: "bg-emerald-50 text-emerald-700 border-emerald-200"
  };
  const labels: Record<string, string> = {
    Todo: t("taskStatus.todo"),
    "In Progress": t("taskStatus.inProgress"),
    "In Review": t("taskStatus.inReview"),
    Blocked: t("taskStatus.blocked"),
    Done: t("taskStatus.done")
  };

  return (
    <span
      className={cn(
        "inline-flex w-fit min-w-[5.5rem] items-center justify-center whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold leading-none tracking-[-0.01em]",
        styles[value] ?? styles.Todo
      )}
    >
      {labels[value] ?? value}
    </span>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    Low: "bg-slate-100 text-slate-600",
    Medium: "bg-indigo-50 text-indigo-700",
    High: "bg-orange-50 text-orange-700",
    Urgent: "bg-rose-50 text-rose-700"
  };
  const labels: Record<string, string> = {
    Low: t("taskForms.low"),
    Medium: t("taskForms.medium"),
    High: t("taskForms.high"),
    Urgent: t("taskForms.urgent")
  };

  return (
    <span
      className={cn(
        "inline-flex w-fit min-w-[4.5rem] items-center justify-center whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-semibold leading-none tracking-[-0.01em]",
        styles[value] ?? styles.Medium
      )}
    >
      {labels[value] ?? value}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full bg-current", className)} />;
}
