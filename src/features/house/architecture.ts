/**
 * House of Art — how existing routes become rooms.
 *
 * /                     Entrance hall. Original TAP hero + five doors + wall opening.
 * /explore              The Wall — explore local arts, music, theater, and culture.
 * /get-involved?door=   Door interiors — one world per path.
 *   space               Artists: apply, reserve free showcase, studio passport.
 *   partner             Venues & sponsors: packages, open a door for artists.
 *   support             Give: donate/shop with visible “what this funds.”
 *   volunteer           Hands & hearts: join missions.
 *   events              Community: calendar, map, leave kindness.
 * /artist-schedule      Editorial spatial calendar (Hacienda / Clematis).
 * /kindness-always      Kindness field — notes float, pin, collect.
 * /supporters           Chapters nationwide.
 * /history              The Artist Post History — sourced public record.
 * /about                Mission, marks, live room.
 * /more                 Studio hub (lightweight local account).
 *
 * Do not invent artist identities. Empty rooms stay cinematic.
 */

import { doorHref, type InvolveDoorId } from "@/content/involve";

export const HOUSE_ROOMS = [
  { id: "entrance", href: "/", label: "The house" },
  { id: "wall", href: "/explore", label: "The Wall" },
  { id: "schedule", href: "/artist-schedule", label: "Nights" },
  { id: "kindness", href: "/kindness-always", label: "Kindness Always" },
  { id: "involve", href: "/get-involved", label: "The doors" },
  { id: "supporters", href: "/supporters", label: "Chapters" },
  { id: "history", href: "/history", label: "History" },
  { id: "studio", href: "/more", label: "Studio" },
] as const;

export function roomForDoor(id: InvolveDoorId): string {
  return doorHref(id);
}
