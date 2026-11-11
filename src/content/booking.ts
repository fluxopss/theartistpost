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

// TODO(Robbie): confirm the real values below before launch. Placeholders:
//  - opensAt / closesAt: real Hacienda sign-up window (house hours are
//    11 AM - 11 PM Sun-Thu and 11 AM - midnight Fri-Sat in src/content/site.ts)
//  - capacityPerBlock: 1 = one artist/act per block
//  - maxBlocksPerPersonPerDay / maxUpcomingPerPerson: the "can't book 365
//    days in a row" fair-use limits
export const blockBooking: BlockBookingConfig = {
  timeZone: "America/New_York",
  opensAt: "10:00",
  closesAt: "22:00",
  blockHours: 4,
  blocksPerDay: 3,
  capacityPerBlock: 1,
  maxBlocksPerPersonPerDay: 1,
  maxUpcomingPerPerson: 3,
  horizonDays: 14,
};
