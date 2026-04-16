"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { useI18n } from "@/components/product/i18n-provider";

export function GlobalSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const { t } = useI18n();

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    startTransition(() => {
      router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const shortcut = pathname === "/search" ? t("globalSearch.submitShortcut") : t("globalSearch.searchShortcut");

  return (
    <form onSubmit={handleSubmit} className="command-bar max-w-[760px]">
      <SearchIcon className="h-4 w-4" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-dim)]"
        placeholder={t("globalSearch.placeholder")}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[11px] text-[var(--text-dim)]"
      >
        {isPending ? "..." : shortcut}
      </button>
    </form>
  );
}
