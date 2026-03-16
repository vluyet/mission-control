import { ok } from "@/lib/api-response";
import { getAgentDocsPayload } from "@/lib/api-contract";

export async function GET() {
  return ok(getAgentDocsPayload());
}
