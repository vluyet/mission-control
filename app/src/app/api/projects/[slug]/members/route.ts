import { error, ok } from "@/lib/api-response";
import { getProjectMembersForUi, setProjectMembersInDb } from "@/lib/server-data";
import { getApiT } from "@/lib/api-i18n";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const t = await getApiT();
  const payload = await getProjectMembersForUi(params.slug);

  if (!payload) {
    return error(t("api.projectNotFound"), 404, { slug: params.slug });
  }

  return ok(payload);
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const t = await getApiT();
  const body = (await request.json().catch(() => null)) as
    | {
        membershipIds?: string[];
        memberRoles?: Record<string, "lead" | "member" | "observer">;
      }
    | null;

  const entries = (body?.membershipIds ?? []).map((membershipId) => ({
    membershipId,
    role: body?.memberRoles?.[membershipId] ?? "member"
  }));

  const result = await setProjectMembersInDb(params.slug, entries);

  if (!result) {
    return error(t("api.projectNotFound"), 404, { slug: params.slug });
  }

  return ok(result);
}
