import {
  createCommunityPost,
  listCommunity,
  parseCommunityQuery,
} from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireCommunityMember } from "@/server/api/safety";
import { resolveOptionalSession } from "@/server/api/session";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/**
 * Community board: top-level posts, newest first. Public; a signed-in viewer
 * also gets `viewerSupported`, `canDelete` and blocked people filtered out.
 * `scope=following` needs a session.
 */
export async function GET(request: Request) {
  return withApiErrors("community", async () => {
    const parsed = parseCommunityQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return apiError("validation_failed", parsed.message, {
        fields: parsed.fields,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "The board is temporarily unavailable.");
    }

    const optional = await resolveOptionalSession(request);
    const result = await listCommunity(
      prisma,
      parsed.query,
      optional ? { id: optional.dbUser.id, role: optional.dbUser.role } : null,
    );
    if (!result.ok) return apiError(result.code, result.message);

    return apiOk(result.page);
  });
}

/** Post to the board (or reply with `parentId`). Community members only. */
export async function POST(request: Request) {
  return withApiErrors("community:create", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const result = await createCommunityPost(session.prisma, session.dbUser, body);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.fields,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk(result.post, { status: 201 });
  });
}
