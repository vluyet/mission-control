import { error, ok } from "@/lib/api-response";
import { getProjectContextFromDb } from "@/lib/server-data";
import { resolveApiActor } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const auth = await resolveApiActor(request, "projects.read");

  if (!auth.ok) {
    return error(auth.message, auth.status, { code: auth.error });
  }

  const payload = await getProjectContextFromDb(params.slug);

  if (!payload) {
    return error("Project not found", 404, { slug: params.slug });
  }

  return ok(payload);
}
