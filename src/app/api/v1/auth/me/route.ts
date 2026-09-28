import { requireApiSession } from "@/server/api/session";
import { apiOk, withApiErrors } from "@/server/api/respond";

export const runtime = "nodejs";

/** Bootstrap the signed-in account: role, handle, artist approval state. */
export async function GET(request: Request) {
  return withApiErrors("auth/me", async () => {
    const ctx = await requireApiSession(request);
    if (ctx instanceof Response) return ctx;

    return apiOk({
      user: ctx.user,
      canPublish:
        ctx.dbUser.role === "ADMIN" ||
        (ctx.dbUser.role === "ARTIST" &&
          ctx.dbUser.artistProfile?.approved === true),
    });
  });
}
