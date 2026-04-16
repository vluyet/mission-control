import { ok } from "@/lib/api-response";
import { getAgentContractPayload } from "@/lib/api-contract";
import { getApiT } from "@/lib/api-i18n";

export async function GET() {
  const t = await getApiT();
  return ok(getAgentContractPayload(t));
}
