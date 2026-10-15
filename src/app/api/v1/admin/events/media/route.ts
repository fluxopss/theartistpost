import { failureResponse } from "@/server/api/eventResult";
import { storeEventCover } from "@/server/api/eventAdmin";
import { apiError, apiOk, withApiErrors } from "@/server/api/respond";
import { requireAdmin } from "@/server/api/session";

export const runtime = "nodejs";

/**
 * Upload a cover photo for a night. Multipart field `file` (image, up to
 * 2.5 MB). Pass the returned `url` as `coverImageUrl` when saving the night.
 */
export async function POST(request: Request) {
  return withApiErrors("admin/events/media", async () => {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

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

    const result = await storeEventCover(admin.dbUser, file);
    return result.ok ? apiOk({ url: result.url }) : failureResponse(result);
  });
}
