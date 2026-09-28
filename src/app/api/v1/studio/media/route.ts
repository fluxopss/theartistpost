import { checkRateLimit } from "@/features/auth/rateLimit";
import { storeUploadedMedia } from "@/server/api/media";
import {
  apiError,
  apiOk,
  clientIp,
  withApiErrors,
} from "@/server/api/respond";
import { requirePublisher } from "@/server/api/session";

export const runtime = "nodejs";

/**
 * Upload image or video for an approved artist.
 * Multipart field name: `file`.
 */
export async function POST(request: Request) {
  return withApiErrors("studio/media", async () => {
    const ctx = await requirePublisher(request);
    if (ctx instanceof Response) return ctx;

    const ip = clientIp(request);
    const limit = checkRateLimit(`v1:studio:media:${ip}`, {
      windowMs: 60_000,
      max: 20,
    });
    if (!limit.ok) {
      return apiError("rate_limited", "Too many uploads. Try again shortly.", {
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      });
    }

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

    const stored = await storeUploadedMedia(file);
    if (!stored.ok) {
      return apiError("validation_failed", stored.error, {
        fields: { file: stored.error },
      });
    }

    return apiOk(stored.media, { status: 201 });
  });
}
