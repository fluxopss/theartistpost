import { getAllTags } from "@/features/posts/queries";
import { toTagsDTO } from "@/server/api/dto";
import { apiOk, CACHE, withApiErrors } from "@/server/api/respond";

export async function GET() {
  return withApiErrors("tags", async () =>
    apiOk(toTagsDTO(await getAllTags()), { cache: CACHE.fiveMinutes }),
  );
}
