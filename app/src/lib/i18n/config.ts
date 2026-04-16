export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_COOKIE_NAME = "mission_control_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLocaleCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };
}
