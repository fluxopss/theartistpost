import { apiError, apiOk, CACHE, withApiErrors } from "@/server/api/respond";
import { listTopics } from "@/server/api/topics";
import { getPrisma } from "@/shared/lib/prisma";

export const runtime = "nodejs";

/** Curated interest topics (genres + community themes), public. */
export async function GET() {
  return withApiErrors("topics", async () => {
    const prisma = getPrisma();
    if (!prisma) {
      return apiError("upstream_unavailable", "Topics are temporarily unavailable.");
    }
    return apiOk(await listTopics(prisma), { cache: CACHE.minute });
  });
}
