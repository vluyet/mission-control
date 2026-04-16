"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translator";

type Primitive = string | number | boolean;

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string, params?: Record<string, Primitive>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({
    locale,
    messages,
    t: createTranslator(messages)
  }), [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
