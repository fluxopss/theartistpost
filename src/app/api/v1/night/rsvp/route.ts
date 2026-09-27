import { handleLeadPost } from "@/server/api/leadRoute";
import { submitNightRsvp } from "@/server/api/leads/nightRsvp";

/** Hold a seat. Body matches /api/night/rsvp, plus optional `platform`. */
export async function POST(request: Request) {
  return handleLeadPost(request, "night-rsvp", submitNightRsvp);
}
