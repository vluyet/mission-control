import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { fr } from "./fr";

export const messagesByLocale = {
  en,
  fr
} as const satisfies Record<Locale, Messages>;

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? en;
}

export { en, fr };
export type { Messages };
