import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type Locale, normalizeLocale } from "./config";
import { getMessages } from "./messages";
import { createTranslator } from "./translator";

function parseAcceptLanguage(value: string | null): Locale | null {
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();

  for (const locale of SUPPORTED_LOCALES) {
    if (lowered.includes(locale.toLowerCase())) {
      return locale;
    }
  }

  return null;
}

export async function resolveRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const headerStore = await headers();
  const accepted = parseAcceptLanguage(headerStore.get("accept-language"));
  return accepted ?? DEFAULT_LOCALE;
}

export async function getRequestI18n() {
  const locale = await resolveRequestLocale();
  const messages = getMessages(locale);
  const t = createTranslator(messages);

  return {
    locale,
    messages,
    t
  };
}
