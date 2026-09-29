import { resolveExpoDev } from "@/server/api/expoDev";
import { apiOk, CACHE, withApiErrors } from "@/server/api/respond";

/**
 * GET /api/v1/app/expo-dev
 * Public tip for Expo Go: current tunnel URL + status.
 * Sourced from EXPO_DEV_TUNNEL_URL / EXPO_GO_URL (VPS env).
 */
export async function GET() {
  return withApiErrors("app/expo-dev", async () =>
    apiOk(resolveExpoDev(), { cache: CACHE.minute }),
  );
}
