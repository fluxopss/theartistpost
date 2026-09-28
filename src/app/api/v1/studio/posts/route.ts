import { z } from "zod";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { readJsonBody } from "@/server/api/auth";
import {
  createStudioPost,
  createStudioPostSchema,
  listStudioPosts,
} from "@/server/api/studio";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { requirePublisher } from "@/server/api/session";

export const runtime = "nodejs";

const listQuerySchema = z.object({
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED", "ALL"])
    .optional()
    .default("ALL"),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/** List the signed-in artist's own studio posts (including drafts). */
export async function GET(request: Request) {
  return withApiErrors("studio/posts:list", async () => {
    const ctx = await requirePublisher(request);
    if (ctx instanceof Response) return ctx;

    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsed.success) {
      return apiError(
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid query",
      );
    }

    const page = await listStudioPosts(ctx.prisma, ctx.dbUser.id, parsed.data);
    return apiOk(page);
  });
}

/** Create a draft or published post for an approved artist. */
export async function POST(request: Request) {
  return withApiErrors("studio/posts:create", async () => {
    const ctx = await requirePublisher(request);
    if (ctx instanceof Response) return ctx;

    const ip = clientIp(request);
    const limit = checkRateLimit(`v1:studio:posts:${ip}`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!limit.ok) {
      return apiError("rate_limited", "Too many posts. Try again shortly.", {
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

    const json = await readJsonBody(request);
    if (!json.ok) {
      return apiError("validation_failed", "Expected a JSON body.");
    }

    const parsed = createStudioPostSchema.safeParse(json.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "body";
        if (!fields[key]) fields[key] = issue.message;
      }
      return apiError(
        "validation_failed",
        parsed.error.issues[0]?.message ?? "Invalid post data",
        { fields },
      );
    }

    const created = await createStudioPost(
      ctx.prisma,
      ctx.session,
      ctx.dbUser,
      parsed.data,
    );
    if (!created.ok) {
      if (created.code === "forbidden") {
        return apiError("forbidden", created.error);
      }
      return apiError("upstream_unavailable", created.error);
    }

    return apiOk(created.post, { status: 201 });
  });
}
