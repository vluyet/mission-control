import { getRequestI18n } from "@/lib/i18n/server";

export async function getApiT() {
  const { t } = await getRequestI18n();
  return t;
}
