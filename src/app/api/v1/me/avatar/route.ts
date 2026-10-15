import { setAvatar } from "@/server/api/meProfile";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireActiveMember } from "@/server/api/session";

export const runtime = "nodejs";

/** Profile photo upload. Multipart field `file` (image, up to 2.5 MB). */
export async function POST(request: Request) {
  return withApiErrors("me/avatar", async () => {
    const ctx = await requireActiveMember(request);
    if (ctx instanceof Response) return ctx;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiError("validation_failed", "Expected multipart form data.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("validation_failed", "No file provided", {
        fields: { file: "No file provided" },
      });
    }

    const result = await setAvatar(ctx.prisma, ctx.dbUser, file);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.code === "validation_failed" ? { file: result.message } : undefined,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ avatarUrl: result.avatarUrl });
  });
}
