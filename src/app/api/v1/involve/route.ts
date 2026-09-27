import { handleLeadPost } from "@/server/api/leadRoute";
import { submitInvolveInquiry } from "@/server/api/leads/involve";

/** Get Involved inquiry. Body matches /api/involve, plus optional `platform`. */
export async function POST(request: Request) {
  return handleLeadPost(request, "involve", submitInvolveInquiry);
}
