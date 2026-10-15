import { storeCommunityImage } from "@/server/api/community";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireCommunityMember } from "@/server/api/safety";

export const runtime = "nodejs";

/**
 * Upload a photo for a community post. Multipart field `file` (image only,
 * up to 2.5 MB). Pass the returned `url` as `imageUrl` when posting.
 */
export async function POST(request: Request) {
  return withApiErrors("community/media", async () => {
    const session = await requireCommunityMember(request);
    if (session instanceof Response) return session;

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

    const result = await storeCommunityImage(session.prisma, session.dbUser, file);
    if (!result.ok) {
      return apiError(result.code, result.message, {
        fields: result.code === "validation_failed" ? { file: result.message } : undefined,
        retryAfterSec: result.retryAfterSec,
      });
    }

    return apiOk({ url: result.url });
  });
}
