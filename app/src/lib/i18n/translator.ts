import { en } from "./messages/en";
import type { Messages } from "./messages";

type Primitive = string | number | boolean;

type NestedValue = Primitive | NestedValue[] | { [key: string]: NestedValue };

function getPathValue(source: Record<string, NestedValue>, key: string): NestedValue | undefined {
  return key.split(".").reduce<NestedValue | undefined>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, NestedValue>)[segment];
  }, source);
}

function interpolate(template: string, params?: Record<string, Primitive>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(.*?)\}/g, (_, token: string) => {
    const value = params[token.trim()];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export type Translator = ReturnType<typeof createTranslator>;

export function createTranslator(messages: Messages) {
  return function t(key: string, params?: Record<string, Primitive>) {
    const localized = getPathValue(messages as unknown as Record<string, NestedValue>, key);
    const fallback = getPathValue(en as unknown as Record<string, NestedValue>, key);
    const resolved = typeof localized === "string" ? localized : typeof fallback === "string" ? fallback : key;
    return interpolate(resolved, params);
  };
}
