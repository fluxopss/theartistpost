/**
 * Daily sign-up blocks at Hacienda. ONE place for every knob: the blocks are
 * computed from this config for each day, so there are no per-day rows to
 * create by hand. Change values here only; the API, the page and the tests
 * all read this object.
 *
 * Robbie (11/10): "3 Four Hour Blocks of time each day from opening to close
 * where people can sign up ... some cannot book 365 straight days in a row."
 */
export type BlockBookingConfig = {
  /** IANA zone the house reads its clock in. */
  timeZone: string;
  /** Wall-clock opening time, "HH:mm". */
  opensAt: string;
  /** Wall-clock closing time, "HH:mm". Must be later the same day. */
  closesAt: string;
  /** Length of one block in hours. */
  blockHours: number;
  /** Blocks per day, laid end to end starting at `opensAt`. */
  blocksPerDay: number;
  /** How many acts a single block holds (1 = one artist/act per block). */
  capacityPerBlock: number;
  /** Fair-use: most blocks one person may hold on a single day. */
  maxBlocksPerPersonPerDay: number;
  /** Fair-use: most future (not yet ended) bookings one person may hold. */
  maxUpcomingPerPerson: number;
  /** How many days ahead (today included) people can see and book. */
  horizonDays: number;
};

// Confirmed by Robbie 2026-11-12: follows Hacienda hours, one per block.
// House hours are 11 AM - 11 PM Sun-Thu and 11 AM - midnight Fri-Sat
// (src/content/site.ts), so three 4-hour blocks from 11:00 to 23:00 fit
// every day. maxBlocksPerPersonPerDay / maxUpcomingPerPerson are the
// "can't book 365 days in a row" fair-use limits.
export const blockBooking: BlockBookingConfig = {
  timeZone: "America/New_York",
  opensAt: "11:00",
  closesAt: "23:00",
  blockHours: 4,
  blocksPerDay: 3,
  capacityPerBlock: 1,
  maxBlocksPerPersonPerDay: 1,
  maxUpcomingPerPerson: 3,
  horizonDays: 14,
};
