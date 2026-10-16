import type { PrismaClient } from "@prisma/client";
import { truncatePreview } from "@/server/api/textFilter";

/**
 * In-app "this night changed" notices. No push, no email: these only appear
 * in the member's Activity list. Never throws — a missed notice must not
 * fail the admin action or RSVP that caused it.
 */
export async function notifyEventPeople(
  prisma: PrismaClient,
  eventId: string,
  userIds: string[],
  preview: string,
): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        type: "EVENT" as const,
        actorId: null,
        targetKind: "event",
        targetRef: eventId,
        preview: truncatePreview(preview),
      })),
    });
  } catch (error) {
    console.error("[notifyEventPeople]", error);
  }
}

/** Everyone who answered going / maybe (waitlisted included). */
export async function eventAudienceIds(
  prisma: PrismaClient,
  eventId: string,
): Promise<string[]> {
  const rows = await prisma.eventRsvp.findMany({
    where: { eventId, status: { in: ["GOING", "MAYBE"] } },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}
