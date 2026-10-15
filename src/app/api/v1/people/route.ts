import { parsePeopleQuery, searchPeople } from "@/server/api/people";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/**
 * People directory. `q` (>= 2 chars) matches name or handle, `topic` filters
 * by topic slug, `suggested=1` (members only) shares >= 1 topic, excludes
 * people you follow and yourself, max 12. Blocked people never appear.
 */
export async function GET(request: Request) {
  return withApiErrors("people", async () => {
    const parsed = parsePeopleQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "People are temporarily unavailable.");
    }

    const optional = await resolveOptionalSession(request);
    const result = await searchPeople(
      prisma,
      parsed.query,
      optional?.dbUser.id ?? null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk(result.page);
  });
}
