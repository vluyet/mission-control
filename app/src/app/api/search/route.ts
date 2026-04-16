import { error, ok } from "@/lib/api-response";
import { resolveApiActor } from "@/lib/api-auth";
import { getApiT } from "@/lib/api-i18n";
import { searchWorkspaceForUi } from "@/lib/server-data";

export async function GET(request: Request) {
  const t = await getApiT();
  const auth = await resolveApiActor(request, "search.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return error(t("api.searchQueryRequired"), 422, {
      code: "QUERY_REQUIRED"
    });
  }

  const results = await searchWorkspaceForUi(query);

  return ok(results);
}
