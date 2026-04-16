"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE_NAME, getLocaleCookieOptions, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/product/i18n-provider";

const LOCALE_LABEL_KEYS: Record<Locale, "common.english" | "common.french"> = {
  en: "common.english",
  fr: "common.french"
};

function buildCookie(locale: Locale) {
  const options = getLocaleCookieOptions();
  const segments = [`${LOCALE_COOKIE_NAME}=${locale}`, `Path=${options.path}`, `Max-Age=${options.maxAge}`, `SameSite=Lax`];

  if (options.secure) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = buildCookie(nextLocale);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <label className="sidebar-select-label" htmlFor="language-switcher">
        {t("shell.languageLabel")}
      </label>
      <div className="workspace-select-wrap mt-2">
        <select
          id="language-switcher"
          className="workspace-select"
          value={locale}
          onChange={(event) => handleChange(event.target.value as Locale)}
          disabled={isPending}
        >
          <option value="en">{t(LOCALE_LABEL_KEYS.en)}</option>
          <option value="fr">{t(LOCALE_LABEL_KEYS.fr)}</option>
        </select>
      </div>
    </div>
  );
}
