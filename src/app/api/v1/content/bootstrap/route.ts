import { buildBootstrap } from "@/server/api/bootstrap";
import { apiOk, CACHE, withApiErrors } from "@/server/api/respond";

export async function GET() {
  return withApiErrors("content/bootstrap", async () =>
    apiOk(await buildBootstrap(), { cache: CACHE.content }),
  );
}
