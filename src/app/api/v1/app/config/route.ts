import { APP_CONFIG } from "@/server/api/appConfig";
import { apiOk, CACHE } from "@/server/api/respond";

export async function GET() {
  return apiOk(APP_CONFIG, { cache: CACHE.fiveMinutes });
}
