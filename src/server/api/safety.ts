import { z } from "zod";
import type {
  PrismaClient,
  ReportStatus,
  ReportTargetType,
} from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";
import { writeAuditLog } from "@/features/posts/audit";
import {
  toPersonSummaryDTO,
  type PersonSummaryDTO,
} from "@/server/api/communityDto";
import { normalizeHandle } from "@/server/api/handles";
import { apiError } from "@/server/api/respond";
import { requireActiveMember, type AuthedContext } from "@/server/api/session";
import { truncatePreview } from "@/server/api/textFilter";
import { zodFieldErrors, type Page } from "@/server/api/validation";

export const COMMUNITY_GATE_MESSAGE =
  "Finish your profile and accept the Community Guidelines first.";

/** Distinct OPEN reports on one target that hide it automatically. */
export const AUTO_HIDE_THRESHOLD = 3;

/**
 * Ids of everyone in a block relationship with `userId`, in either
 * direction. Both sides become invisible to each other.
 */
export async function blockedIdsFor(
  prisma: PrismaClient,
  userId: string,
): Promise<Set<string>> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return ids;
}

/**
 * Session + not suspended + Community Guidelines accepted + handle set.
 * Gate for every community write (follow, post, reply, support, media).
 */
export async function requireCommunityMember(
  request: Request,
): Promise<AuthedContext | Response> {
  const ctx = await requireActiveMember(request);
  if (ctx instanceof Response) return ctx;
  if (!ctx.dbUser.termsAcceptedAt || !ctx.dbUser.handle) {
    return apiError("forbidden", COMMUNITY_GATE_MESSAGE);
  }
  return ctx;
}

type Failure = {
  ok: false;
  code:
    | "validation_failed"
    | "not_found"
    | "forbidden"
    | "conflict"
    | "rate_limited"
    | "upstream_unavailable";
  message: string;
  fields?: Record<string, string>;
  retryAfterSec?: number;
};

function retryAfter(limit: { retryAfterMs: number }): number {
  return Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

export const blockBodySchema = z.object({
  handle: z.string().trim().min(1).max(60),
});

/**
 * Block someone: two-way invisibility. Also removes follows in both
 * directions and any notifications between the pair.
 */
export async function blockUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<{ ok: true; blocked: true } | Failure> {
  const parsed = blockBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: "Tell us who to block.",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const handle = normalizeHandle(parsed.data.handle.replace(/^@/, ""));

  if (dbUser.handle && handle === normalizeHandle(dbUser.handle)) {
    return {
      ok: false,
      code: "validation_failed",
      message: "You can't block yourself.",
    };
  }

  const limit = checkRateLimit(`v1:block:${dbUser.id}`, {
    windowMs: 60_000,
    max: 30,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Slow down a little.",
      retryAfterSec: retryAfter(limit),
    };
  }

  try {
    const target = await prisma.user.findFirst({ where: { handle } });
    if (!target) {
      return { ok: false, code: "not_found", message: "No one with that handle." };
    }
    if (target.id === dbUser.id) {
      return {
        ok: false,
        code: "validation_failed",
        message: "You can't block yourself.",
      };
    }

    const key = {
      blockerId_blockedId: { blockerId: dbUser.id, blockedId: target.id },
    };
    const existing = await prisma.block.findUnique({ where: key });
    if (!existing) {
      try {
        await prisma.block.create({
          data: { blockerId: dbUser.id, blockedId: target.id },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }

    await prisma.$transaction([
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: dbUser.id, followingId: target.id },
            { followerId: target.id, followingId: dbUser.id },
          ],
        },
      }),
      prisma.notification.deleteMany({
        where: {
          OR: [
            { userId: dbUser.id, actorId: target.id },
            { userId: target.id, actorId: dbUser.id },
          ],
        },
      }),
    ]);

    if (!existing) {
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "block.create",
        targetType: "User",
        targetId: target.id,
      });
    }
    return { ok: true, blocked: true };
  } catch (error) {
    console.error("[blockUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not block just now.",
    };
  }
}

export async function unblockUser(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  rawHandle: string,
): Promise<{ ok: true; blocked: false } | Failure> {
  try {
    const handle = normalizeHandle(rawHandle);
    const target = await prisma.user.findFirst({ where: { handle } });
    if (!target) {
      return { ok: false, code: "not_found", message: "No one with that handle." };
    }
    const result = await prisma.block.deleteMany({
      where: { blockerId: dbUser.id, blockedId: target.id },
    });
    if ((result as { count?: number } | undefined)?.count) {
      await writeAuditLog(prisma, {
        actorId: dbUser.id,
        action: "block.remove",
        targetType: "User",
        targetId: target.id,
      });
    }
    return { ok: true, blocked: false };
  } catch (error) {
    console.error("[unblockUser]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not unblock just now.",
    };
  }
}

/** People you have blocked (not the people who blocked you). */
export async function listBlocks(
  prisma: PrismaClient,
  userId: string,
): Promise<PersonSummaryDTO[]> {
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: { include: { artistProfile: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((row) => toPersonSummaryDTO(row.blocked, false));
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "self_harm",
  "impersonation",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGET_TYPES = [
  "POST",
  "COMMENT",
  "COMMUNITY_POST",
  "USER",
] as const satisfies readonly ReportTargetType[];

export type ReportDTO = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  reportCount: number;
  preview: string | null;
  reporter: { handle: string | null; name: string };
  createdAt: string;
};

export const reportBodySchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid id."),
  reason: z.enum(REPORT_REASONS),
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters.")
    .nullable()
    .optional(),
});

type TargetRef = { targetType: ReportTargetType; targetId: string };

/** Who owns the reported thing (null when it no longer exists). */
async function resolveTargetOwner(
  prisma: PrismaClient,
  target: TargetRef,
): Promise<string | null> {
  switch (target.targetType) {
    case "USER": {
      const user = await prisma.user.findUnique({
        where: { id: target.targetId },
        select: { id: true },
      });
      return user?.id ?? null;
    }
    case "POST": {
      const post = await prisma.post.findUnique({
        where: { id: target.targetId },
        select: { authorId: true },
      });
      return post?.authorId ?? null;
    }
    case "COMMENT": {
      const comment = await prisma.comment.findUnique({
        where: { id: target.targetId },
        select: { userId: true },
      });
      return comment?.userId ?? null;
    }
    case "COMMUNITY_POST": {
      const post = await prisma.communityPost.findUnique({
        where: { id: target.targetId },
        select: { authorId: true },
      });
      return post?.authorId ?? null;
    }
  }
}

async function previewFor(
  prisma: PrismaClient,
  target: TargetRef,
): Promise<string | null> {
  switch (target.targetType) {
    case "USER": {
      const user = await prisma.user.findUnique({
        where: { id: target.targetId },
        select: { name: true, handle: true },
      });
      return user ? truncatePreview(`${user.name} @${user.handle ?? ""}`) : null;
    }
    case "POST": {
      const post = await prisma.post.findUnique({
        where: { id: target.targetId },
        select: { title: true },
      });
      return truncatePreview(post?.title);
    }
    case "COMMENT": {
      const comment = await prisma.comment.findUnique({
        where: { id: target.targetId },
        select: { body: true },
      });
      return truncatePreview(comment?.body);
    }
    case "COMMUNITY_POST": {
      const post = await prisma.communityPost.findUnique({
        where: { id: target.targetId },
        select: { body: true },
      });
      return truncatePreview(post?.body);
    }
  }
}

/** Hide the reported content (people are suspended, not hidden). */
async function hideTarget(
  prisma: PrismaClient,
  target: TargetRef,
): Promise<void> {
  const now = new Date();
  if (target.targetType === "COMMENT") {
    await prisma.comment.updateMany({
      where: { id: target.targetId, hiddenAt: null },
      data: { hiddenAt: now },
    });
  } else if (target.targetType === "COMMUNITY_POST") {
    await prisma.communityPost.updateMany({
      where: { id: target.targetId, hiddenAt: null },
      data: { hiddenAt: now },
    });
  } else if (target.targetType === "POST") {
    await prisma.post.updateMany({
      where: { id: target.targetId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
  }
}

/** Undo an auto-hide when moderators dismiss the reports (Wall posts stay archived). */
async function restoreTarget(
  prisma: PrismaClient,
  target: TargetRef,
): Promise<void> {
  if (target.targetType === "COMMENT") {
    await prisma.comment.updateMany({
      where: { id: target.targetId },
      data: { hiddenAt: null },
    });
  } else if (target.targetType === "COMMUNITY_POST") {
    await prisma.communityPost.updateMany({
      where: { id: target.targetId },
      data: { hiddenAt: null },
    });
  }
}

export type CreateReportResult =
  | { ok: true; id: string; created: boolean }
  | Failure;

/**
 * File a report. One per reporter per target (a repeat returns the same id).
 * Reporting yourself or your own content is rejected. The third distinct OPEN
 * report on a target hides it until a moderator decides.
 */
export async function createReport(
  prisma: PrismaClient,
  dbUser: DbUserWithProfile,
  raw: unknown,
): Promise<CreateReportResult> {
  const parsed = reportBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid report",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  if (input.targetType === "USER" && input.targetId === dbUser.id) {
    return {
      ok: false,
      code: "validation_failed",
      message: "You can't report yourself.",
    };
  }

  const limit = checkRateLimit(`v1:report:${dbUser.id}`, {
    windowMs: 60 * 60_000,
    max: 20,
  });
  if (!limit.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many reports just now. Try again later.",
      retryAfterSec: retryAfter(limit),
    };
  }

  try {
    const owner = await resolveTargetOwner(prisma, input);
    if (!owner) {
      return { ok: false, code: "not_found", message: "That is already gone." };
    }
    if (owner === dbUser.id) {
      return {
        ok: false,
        code: "validation_failed",
        message: "You can't report your own content.",
      };
    }

    const existing = await prisma.report.findUnique({
      where: {
        reporterId_targetType_targetId: {
          reporterId: dbUser.id,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
    });
    if (existing) return { ok: true, id: existing.id, created: false };

    const report = await prisma.report.create({
      data: {
        reporterId: dbUser.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note ? input.note : null,
      },
    });

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: "report.create",
      targetType: "Report",
      targetId: report.id,
      meta: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
      },
    });

    if (input.targetType !== "USER") {
      const open = await prisma.report.count({
        where: {
          targetType: input.targetType,
          targetId: input.targetId,
          status: "OPEN",
        },
      });
      if (open >= AUTO_HIDE_THRESHOLD) {
        await hideTarget(prisma, input);
        await writeAuditLog(prisma, {
          actorId: null,
          action: "moderation.auto_hide",
          targetType: input.targetType,
          targetId: input.targetId,
          meta: { openReports: open },
        });
      }
    }

    return { ok: true, id: report.id, created: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Two taps raced: return the report that won.
      const winner = await prisma.report.findUnique({
        where: {
          reporterId_targetType_targetId: {
            reporterId: dbUser.id,
            targetType: input.targetType,
            targetId: input.targetId,
          },
        },
      });
      if (winner) return { ok: true, id: winner.id, created: false };
    }
    console.error("[createReport]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not send that report.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Moderation queue                                                    */
/* ------------------------------------------------------------------ */

export const ADMIN_REPORTS_DEFAULT_TAKE = 20;
export const ADMIN_REPORTS_MAX_TAKE = 30;
const REPORT_STATUSES = ["OPEN", "ACTIONED", "DISMISSED"] as const;

export type AdminReportsQuery = {
  status: ReportStatus;
  offset: number;
  take: number;
};

export function parseAdminReportsQuery(
  params: URLSearchParams,
):
  | { ok: true; query: AdminReportsQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const rawStatus = params.get("status") || "OPEN";
  if (!(REPORT_STATUSES as readonly string[]).includes(rawStatus)) {
    fields.status = "status must be OPEN, ACTIONED or DISMISSED.";
  }

  // The queue is grouped, so its cursor is a plain offset into the groups.
  let offset = 0;
  const rawCursor = params.get("cursor");
  if (rawCursor) {
    if (/^\d{1,6}$/.test(rawCursor)) offset = Number(rawCursor);
    else fields.cursor = "cursor must be a nextCursor value from a previous page.";
  }

  let take = ADMIN_REPORTS_DEFAULT_TAKE;
  const rawTake = params.get("take");
  if (rawTake) {
    const n = /^\d+$/.test(rawTake) ? Number(rawTake) : NaN;
    if (!Number.isSafeInteger(n) || n < 1) {
      fields.take = `take must be a whole number from 1 to ${ADMIN_REPORTS_MAX_TAKE}.`;
    } else {
      take = Math.min(n, ADMIN_REPORTS_MAX_TAKE);
    }
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, message: "Check the query parameters.", fields };
  }
  return {
    ok: true,
    query: { status: rawStatus as ReportStatus, offset, take },
  };
}

type ReportWithReporter = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note: string | null;
  status: ReportStatus;
  createdAt: Date;
  reporter: { handle: string | null; name: string };
};

async function toReportDTO(
  prisma: PrismaClient,
  report: ReportWithReporter,
  reportCount: number,
  status: ReportStatus = report.status,
): Promise<ReportDTO> {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason as ReportReason,
    note: report.note ?? null,
    status,
    reportCount,
    preview: await previewFor(prisma, report),
    reporter: {
      handle: report.reporter.handle ?? null,
      name: report.reporter.name,
    },
    createdAt: report.createdAt.toISOString(),
  };
}

/** One row per reported target, newest activity first, with its report count. */
export async function listReportsForAdmin(
  prisma: PrismaClient,
  query: AdminReportsQuery,
): Promise<Page<ReportDTO>> {
  const groups = (await prisma.report.groupBy({
    by: ["targetType", "targetId"],
    where: { status: query.status },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    skip: query.offset,
    take: query.take + 1,
  } as never)) as unknown as Array<{
    targetType: ReportTargetType;
    targetId: string;
    _count: { _all: number };
  }>;

  const hasMore = groups.length > query.take;
  const slice = hasMore ? groups.slice(0, query.take) : groups;

  const items = (
    await Promise.all(
      slice.map(async (group) => {
        const latest = (await prisma.report.findFirst({
          where: {
            targetType: group.targetType,
            targetId: group.targetId,
            status: query.status,
          },
          orderBy: { createdAt: "desc" },
          include: { reporter: { select: { handle: true, name: true } } },
        })) as ReportWithReporter | null;
        return latest ? toReportDTO(prisma, latest, group._count._all) : null;
      }),
    )
  ).filter((item): item is ReportDTO => item !== null);

  return {
    items,
    nextCursor: hasMore ? String(query.offset + query.take) : null,
  };
}

export const actOnReportSchema = z.object({
  action: z.enum(["hide", "dismiss", "suspend_user"]),
  reason: z.string().trim().max(200).optional(),
});

export type ActOnReportResult = { ok: true; report: ReportDTO } | Failure;

/**
 * Moderator decision for a reported target (applies to every OPEN report on it).
 * hide: hide the content. dismiss: reports were unfounded (restores an
 * auto-hidden comment or board post). suspend_user: suspend the owner (read-only)
 * and hide the content.
 */
export async function actOnReport(
  prisma: PrismaClient,
  admin: DbUserWithProfile,
  reportId: string,
  raw: unknown,
): Promise<ActOnReportResult> {
  const parsed = actOnReportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid action",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const { action, reason } = parsed.data;

  try {
    const report = (await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: { select: { handle: true, name: true } } },
    })) as ReportWithReporter | null;
    if (!report) {
      return { ok: false, code: "not_found", message: "That report is gone." };
    }
    const target: TargetRef = {
      targetType: report.targetType,
      targetId: report.targetId,
    };

    if (action === "hide" && target.targetType === "USER") {
      return {
        ok: false,
        code: "validation_failed",
        message: "People are suspended, not hidden. Use suspend_user.",
      };
    }

    let ownerId: string | null = null;
    if (action === "suspend_user") {
      ownerId = await resolveTargetOwner(prisma, target);
      if (!ownerId) {
        return { ok: false, code: "not_found", message: "That account is gone." };
      }
      if (ownerId === admin.id) {
        return {
          ok: false,
          code: "conflict",
          message: "You can't suspend yourself.",
        };
      }
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { role: true },
      });
      if (owner?.role === "ADMIN") {
        return {
          ok: false,
          code: "conflict",
          message: "Admins can't be suspended from the queue.",
        };
      }
    }

    // Preview first: after a hide the content is still readable by id.
    const status: ReportStatus = action === "dismiss" ? "DISMISSED" : "ACTIONED";

    if (action === "hide") {
      await hideTarget(prisma, target);
    } else if (action === "suspend_user" && ownerId) {
      await prisma.user.update({
        where: { id: ownerId },
        data: { suspendedAt: new Date() },
      });
      await hideTarget(prisma, target);
    } else if (action === "dismiss") {
      await restoreTarget(prisma, target);
    }

    const resolved = await prisma.report.updateMany({
      where: {
        targetType: target.targetType,
        targetId: target.targetId,
        status: "OPEN",
      },
      data: { status, resolvedById: admin.id, resolvedAt: new Date() },
    });

    await writeAuditLog(prisma, {
      actorId: admin.id,
      action: `moderation.${action}`,
      targetType: target.targetType,
      targetId: target.targetId,
      meta: {
        reportId,
        reason: reason ?? null,
        reports: (resolved as { count?: number } | undefined)?.count ?? 0,
        ...(ownerId ? { suspendedUserId: ownerId } : {}),
      },
    });

    return {
      ok: true,
      report: await toReportDTO(
        prisma,
        report,
        Math.max(1, (resolved as { count?: number } | undefined)?.count ?? 1),
        status,
      ),
    };
  } catch (error) {
    console.error("[actOnReport]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not apply that decision.",
    };
  }
}

