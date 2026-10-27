import { adsenseClient } from "@/lib/adsense";
import {
  adPlacement,
  approvedSlots,
  type AdPlacementId,
} from "@/lib/ads/placements";
import { AdPreviewMarker } from "./AdPreviewMarker";
import { AdRouteGuard } from "./AdRouteGuard";
import { AdUnit } from "./AdUnit";

/**
 * A candidate ad spot. Renders a real AdSense unit (which is also the only
 * thing that loads Google's ad script) only when the publisher ID is set AND
 * Robbie approved this spot (ADSENSE_SLOTS). Otherwise it renders nothing,
 * except an outline in preview mode (?ad-preview=1). On an ad-free route it
 * renders nothing at all, whatever is configured (AdRouteGuard).
 * Server component: env is read at build for static pages (rebuild to apply).
 */
export function AdSlot({ placement }: { placement: AdPlacementId }) {
  const spot = adPlacement(placement);
  const client = adsenseClient();
  const slot = approvedSlots().get(placement);

  return (
    <AdRouteGuard>
      {client && slot ? (
        <AdUnit client={client} slot={slot} placement={placement} />
      ) : (
        <AdPreviewMarker label={spot.label} why={spot.why} />
      )}
    </AdRouteGuard>
  );
}
