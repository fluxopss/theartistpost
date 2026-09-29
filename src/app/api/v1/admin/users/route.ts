import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const DEFAULT_TAKE = 24;
const MAX_TAKE = 50;
const WHOLE_NUMBER_RE = /^\d+$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Admin-only customer list from the real User table.
 * Does not invent rows — empty when the house has no accounts yet.
 *
 * Query: `pendingArtist=1` → artists awaiting approval only.
 */
export async function GET(request: Request) {
  return withApiErrors("admin/users", async () => {
    const ctx = await requireAdmin(request);
    if (ctx instanceof Response) return ctx;

    const params = new URL(request.url).searchParams;
    const fields: Record<string, string> = {};

    let take = DEFAULT_TAKE;
    const rawTake = params.get("take");
    if (rawTake !== null && rawTake !== "") {
      const n = WHOLE_NUMBER_RE.test(rawTake) ? Number(rawTake) : NaN;
      if (!Number.isSafeInteger(n) || n < 1) {
        fields.take = `take must be a whole number from 1 to ${MAX_TAKE}.`;
      } else {
        take = Math.min(n, MAX_TAKE);
      }
    }

    const cursor = params.get("cursor") || undefined;
    if (cursor !== undefined && !CURSOR_RE.test(cursor)) {
      fields.cursor = "cursor must be a nextCursor value from a previous page.";
    }

    const pendingRaw = params.get("pendingArtist");
    let pendingArtist = false;
    if (pendingRaw !== null && pendingRaw !== "") {
      if (pendingRaw === "1" || pendingRaw === "true") {
        pendingArtist = true;
      } else if (pendingRaw === "0" || pendingRaw === "false") {
        pendingArtist = false;
      } else {
        fields.pendingArtist = "pendingArtist must be 1/true or 0/false.";
      }
    }

    if (Object.keys(fields).length > 0) {
      return apiError("validation_failed", "Check the query parameters.", {
        fields,
      });
    }

    const where: Prisma.UserWhereInput = pendingArtist
      ? {
          artistProfile: { is: { approved: false } },
        }
      : {};

    const users = await ctx.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { artistProfile: true },
    });

    const hasMore = users.length > take;
    const slice = hasMore ? users.slice(0, take) : users;

    return apiOk({
      items: slice.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        handle: u.artistProfile?.handle ?? null,
        artistApproved: u.artistProfile?.approved ?? null,
        deniedSeed: isDeniedAuthorEmail(u.email),
        createdAt: u.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    });
  });
}
