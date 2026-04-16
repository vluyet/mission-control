import { ok } from "@/lib/api-response";
import { getAgentDocsPayload } from "@/lib/api-contract";
import { getApiT } from "@/lib/api-i18n";

export async function GET() {
  const t = await getApiT();
  return ok(getAgentDocsPayload(t));
}
