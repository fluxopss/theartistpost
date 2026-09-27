import { handleLeadPost } from "@/server/api/leadRoute";
import { submitSubscribe } from "@/server/api/leads/subscribe";

/** Newsletter sign-up. Body matches /api/subscribe, plus optional `platform`. */
export async function POST(request: Request) {
  return handleLeadPost(request, "subscribe", submitSubscribe);
}
