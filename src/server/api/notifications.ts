import { z } from "zod";
import type {
  NotificationType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { writeAuditLog } from "@/features/posts/audit";
import { blockedIdsFor } from "@/server/api/safety";
import { truncatePreview } from "@/server/api/textFilter";
import { absoluteUrl } from "@/server/api/urls";
export { truncatePreview };
import { zodFieldErrors, type Page, type PageParams } from "@/server/api/validation";

export const NOTIFICATIONS_DEFAULT_TAKE = 20;
export const NOTIFICATIONS_MAX_TAKE = 30;

export type NotifyInput = {
  userId: string;
  actorId: string;
  type: NotificationType;
  targetKind: "post" | "community" | "person";
  targetRef: string | null;
  preview?: string | null;
};

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  actor: { handle: string; name: string; avatarUrl: string | null } | null;
  target:
    | { kind: "post"; slug: string }
    | { kind: "community"; id: string }
    | { kind: "person"; handle: string }
    | null;
  preview: string | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * Create an in-app notification. Never throws (failures are logged, because a
 * missed notification must never fail the action that triggered it). Skips
 * yourself, skips either direction of a block, and skips when an identical
 * unread notification (same type + actor + target) already exists.
 */
export async function notify(
  prisma: PrismaClient,
  input: NotifyInput,
): Promise<void> {
  try {
    if (input.userId === input.actorId) return;

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: input.userId, blockedId: input.actorId },
          { blockerId: input.actorId, blockedId: input.userId },
        ],
      },
      select: { blockerId: true },
    });
    if (blocked) return;

    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId,
        targetKind: input.targetKind,
        targetRef: input.targetRef,
        readAt: null,
      },
      select: { id: true },
    });
    if (duplicate) return;

    await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type,
        targetKind: input.targetKind,
        targetRef: input.targetRef,
        preview: truncatePreview(input.preview),
      },
    });
  } catch (error) {
    console.error("[notify]", error);
  }
}

type NotificationRow = {
  id: string;
  type: NotificationType;
  targetKind: string;
  targetRef: string | null;
  preview: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    handle: string | null;
    name: string;
    image: string | null;
    artistProfile: { avatarUrl: string | null } | null;
  } | null;
};

function toTarget(row: NotificationRow): NotificationDTO["target"] {
  if (!row.targetRef) return null;
  switch (row.targetKind) {
    case "post":
      return { kind: "post", slug: row.targetRef };
    case "community":
      return { kind: "community", id: row.targetRef };
    case "person":
      return { kind: "person", handle: row.targetRef };
    default:
      return null;
  }
}

export function toNotificationDTO(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    actor: row.actor
      ? {
          handle: row.actor.handle ?? "",
          name: row.actor.name,
          avatarUrl: absoluteUrl(
            row.actor.artistProfile?.avatarUrl ?? row.actor.image,
          ),
        }
      : null,
    target: toTarget(row),
    preview: row.preview ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function fromVisibleActors(
  userId: string,
  blocked: Set<string>,
): Prisma.NotificationWhereInput {
  return {
    userId,
    ...(blocked.size > 0
      ? { OR: [{ actorId: null }, { actorId: { notIn: [...blocked] } }] }
      : {}),
  };
}

export type NotificationsPage = Page<NotificationDTO> & { unreadCount: number };

/** Newest first; notifications from blocked people (either way) are omitted. */
export async function listNotifications(
  prisma: PrismaClient,
  userId: string,
  page: PageParams,
): Promise<NotificationsPage> {
  const blocked = await blockedIdsFor(prisma, userId);
  const base = fromVisibleActors(userId, blocked);

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: base,
      include: { actor: { include: { artistProfile: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: page.take + 1,
      ...(page.cursor ? { skip: 1, cursor: { id: page.cursor } } : {}),
    }),
    prisma.notification.count({ where: { ...base, readAt: null } }),
  ]);

  const hasMore = rows.length > page.take;
  const slice = hasMore ? rows.slice(0, page.take) : rows;
  return {
    items: slice.map((row) => toNotificationDTO(row as NotificationRow)),
    nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    unreadCount,
  };
}

export const markReadSchema = z.object({
  ids: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid id."))
    .max(100, "Too many ids.")
    .optional(),
});

export type MarkReadResult =
  | { ok: true; unreadCount: number }
  | {
      ok: false;
      code: "validation_failed" | "rate_limited" | "upstream_unavailable";
      message: string;
      fields?: Record<string, string>;
      retryAfterSec?: number;
    };

/** Mark specific ids (yours only) or, with no `ids`, everything as read. */
export async function markRead(
  prisma: PrismaClient,
  userId: string,
  raw: unknown,
): Promise<MarkReadResult> {
  const parsed = markReadSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid request",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const limit = checkRateLimit(`v1:notifications:read:${userId}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down a little.",
      retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
    };
  }

  try {
    const { ids } = parsed.data;
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(ids ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });

    const changed = (result as { count?: number } | undefined)?.count ?? 0;
    if (changed > 0) {
      await writeAuditLog(prisma, {
        actorId: userId,
        action: "notification.read",
        targetType: "User",
        targetId: userId,
        meta: { count: changed, all: ids === undefined },
      });
    }

    const blocked = await blockedIdsFor(prisma, userId);
    const unreadCount = await prisma.notification.count({
      where: { ...fromVisibleActors(userId, blocked), readAt: null },
    });
    return { ok: true, unreadCount };
  } catch (error) {
    console.error("[markRead]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not update notifications.",
    };
  }
}
