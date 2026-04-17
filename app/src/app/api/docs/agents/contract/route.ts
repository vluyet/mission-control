import { ok } from "@/lib/api-response";
import { getAgentContractPayload } from "@/lib/api-contract";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translator";

export async function GET() {
  return ok(getAgentContractPayload(createTranslator(en), en));
}
