import { ok } from "@/lib/api-response";
import { getAgentContractPayload } from "@/lib/api-contract";

export async function GET() {
  return ok(getAgentContractPayload());
}
