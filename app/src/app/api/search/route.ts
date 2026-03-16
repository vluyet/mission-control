import { error, ok } from "@/lib/api-response";
import { searchWorkspaceForUi } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await resolveApiActor(request, "search.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return error("Search query is required", 422, {
      code: "QUERY_REQUIRED"
    });
  }

  const results = await searchWorkspaceForUi(query);

  return ok(results);
}
