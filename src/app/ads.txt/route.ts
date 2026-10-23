import { adsTxt } from "@/lib/adsense";

/** /ads.txt — present only once ADSENSE_PUBLISHER_ID is set (read per request). */
export const dynamic = "force-dynamic";

export function GET() {
  const body = adsTxt();
  if (!body) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
