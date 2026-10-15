/**
 * Pure rules for managed events: distance, check-in window, seats and the
 * waitlist. No I/O here so the privacy-sensitive parts are easy to audit.
 */

/** A check-in counts as "at the venue" within this many metres. */
export const CHECKIN_RADIUS_M = 300;
/** Check-in opens this long before the start (doors). */
export const CHECKIN_LEAD_MS = 30 * 60_000;
/** A reading less precise than this cannot verify presence. */
export const CHECKIN_MAX_ACCURACY_M = 200;

export type LatLng = { lat: number; lng: number };
export type LocationReading = LatLng & { accuracyM?: number | null };
export type VenuePoint = { lat: number | null; lng: number | null };

const EARTH_RADIUS_M = 6_371_000;

function isValidCoordinate(p: LatLng): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Is this single reading near the venue? Returns only a boolean — callers
 * must not keep the reading itself.
 */
export function verifyProximity(
  venue: VenuePoint,
  reading: LocationReading | null,
): boolean {
  if (!reading) return false;
  if (venue.lat === null || venue.lng === null) return false;
  if (!isValidCoordinate(reading)) return false;
  if (
    reading.accuracyM !== undefined &&
    reading.accuracyM !== null &&
    (!Number.isFinite(reading.accuracyM) ||
      reading.accuracyM > CHECKIN_MAX_ACCURACY_M)
  ) {
    return false;
  }
  return (
    haversineMeters({ lat: venue.lat, lng: venue.lng }, reading) <=
    CHECKIN_RADIUS_M
  );
}

export type CheckInWindow = "before" | "open" | "after";

export function checkInWindow(
  event: { startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): CheckInWindow {
  const t = now.getTime();
  if (t < event.startsAt.getTime() - CHECKIN_LEAD_MS) return "before";
  if (t > event.endsAt.getTime()) return "after";
  return "open";
}

export function decideSeats(input: {
  capacity: number | null;
  /** Confirmed seats held by everyone except this guest. */
  otherSeats: number;
  party: number;
}): "confirmed" | "waitlisted" {
  if (input.capacity === null) return "confirmed";
  return input.otherSeats + input.party <= input.capacity
    ? "confirmed"
    : "waitlisted";
}

/**
 * Who gets a seat when one frees up. First come first served, but a party
 * that does not fit never blocks the smaller ones behind it.
 */
export function promoteFromWaitlist(input: {
  capacity: number | null;
  confirmedSeats: number;
  waitlist: { id: string; party: number; waitlistedAt: Date }[];
}): string[] {
  if (input.capacity === null) return input.waitlist.map((w) => w.id);
  let free = input.capacity - input.confirmedSeats;
  const promoted: string[] = [];
  const ordered = [...input.waitlist].sort(
    (a, b) => a.waitlistedAt.getTime() - b.waitlistedAt.getTime(),
  );
  for (const entry of ordered) {
    if (free <= 0) break;
    if (entry.party <= free) {
      promoted.push(entry.id);
      free -= entry.party;
    }
  }
  return promoted;
}
