import { getRequestI18n } from "@/lib/i18n/server";

export async function getApiT() {
  const { t } = await getRequestI18n();
  return t;
}

export async function getApiI18n() {
  return getRequestI18n();
}
