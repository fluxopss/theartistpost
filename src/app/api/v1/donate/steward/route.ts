import { handleLeadPost } from "@/server/api/leadRoute";
import { submitDonorSteward } from "@/server/api/leads/donor";

/** Soft donor stewardship → GHL. Body: { email, cadence?, platform? }. */
export async function POST(request: Request) {
  return handleLeadPost(request, "donate-steward", submitDonorSteward);
}
