import { z } from "zod";
import type {
  ArtistProfile,
  Prisma,
  PrismaClient,
  Role,
  User,
} from "@prisma/client";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { issueSignInChallenge } from "@/features/auth/challenges";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { truncatePreview } from "@/server/api/textFilter";
import { absoluteUrl } from "@/server/api/urls";
import { parsePageParams, zodFieldErrors, type Page } from "@/server/api/validation";

/**
 * Admin "People" tooling: search, member detail and audited actions.
 * Every export here is reached only through `requireAdmin` routes.
 * Emails appear in these DTOs because the audience is admins only; none
 * of these types are reused by a public endpoint.
 */

export const ADMIN_PEOPLE_DEFAULT_TAKE = 24;
export const ADMIN_PEOPLE_MAX_TAKE = 50;
export const ADMIN_PEOPLE_MAX_QUERY = 80;

const ROLES = ["VIEWER", "ARTIST", "ADMIN"] as const satisfies readonly Role[];
const STATUSES = ["active", "suspended"] as const;
type PersonStatus = (typeof STATUSES)[number];

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export type AdminPeopleQuery = {
  q: string | null;
  role: Role | null;
  status: PersonStatus | null;
  pendingArtist: boolean;
  cursor: string | undefined;
  take: number;
};

export function parseAdminPeopleQuery(
  params: URLSearchParams,
):
  | { ok: true; query: AdminPeopleQuery }
  | { ok: false; message: string; fields: Record<string, string> } {
  const page = parsePageParams(params, {
    defaultTake: ADMIN_PEOPLE_DEFAULT_TAKE,
    maxTake: ADMIN_PEOPLE_MAX_TAKE,
  });
  const fields: Record<string, string> = page.ok ? {} : { ...page.fields };

  const rawQ = (params.get("q") ?? "").trim();
  if (rawQ.length > ADMIN_PEOPLE_MAX_QUERY) {
    fields.q = `Search is limited to ${ADMIN_PEOPLE_MAX_QUERY} characters.`;
  }

  let role: Role | null = null;
  const rawRole = params.get("role");
  if (rawRole) {
    if ((ROLES as readonly string[]).includes(rawRole)) role = rawRole as Role;
    else fields.role = "role must be VIEWER, ARTIST or ADMIN.";
  }

  let status: PersonStatus | null = null;
  const rawStatus = params.get("status");
  if (rawStatus) {
    if ((STATUSES as readonly string[]).includes(rawStatus)) {
      status = rawStatus as PersonStatus;
    } else {
      fields.status = "status must be active or suspended.";
    }
  }

  let pendingArtist = false;
  const rawPending = params.get("pendingArtist");
  if (rawPending) {
    if (rawPending === "1" || rawPending === "true") pendingArtist = true;
    else if (rawPending !== "0" && rawPending !== "false") {
      fields.pendingArtist = "pendingArtist must be 1/true or 0/false.";
    }
  }

  if (Object.keys(fields).length > 0 || !page.ok) {
    return { ok: false, message: "Check the query parameters.", fields };
  }

  return {
    ok: true,
    query: {
      q: rawQ ? rawQ : null,
      role,
      status,
      pendingArtist,
      cursor: page.page.cursor,
      take: page.page.take,
    },
  };
}

export function buildAdminPeopleWhere(
  query: Pick<AdminPeopleQuery, "q" | "role" | "status" | "pendingArtist">,
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  const needle = query.q?.replace(/^@+/, "").trim();
  if (needle) {
    and.push({
      OR: [
        { name: { contains: needle, mode: "insensitive" } },
        { email: { contains: needle, mode: "insensitive" } },
        { handle: { contains: needle, mode: "insensitive" } },
        {
          artistProfile: {
            is: { handle: { contains: needle, mode: "insensitive" } },
          },
        },
      ],
    });
  }
  if (query.role) and.push({ role: query.role });
  if (query.status === "suspended") and.push({ suspendedAt: { not: null } });
  if (query.status === "active") and.push({ suspendedAt: null });
  if (query.pendingArtist) {
    and.push({ artistProfile: { is: { approved: false } } });
  }

  if (and.length === 0) return {};
  if (and.length === 1) return and[0]!;
  return { AND: and };
}

export type AdminPersonRowDTO = {
  id: string;
  name: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  role: Role;
  artistApproved: boolean | null;
  suspended: boolean;
  deniedSeed: boolean;
  createdAt: string;
};

type PersonRow = User & { artistProfile: ArtistProfile | null };

export function toAdminPersonRow(user: PersonRow): AdminPersonRowDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    handle: user.artistProfile?.handle ?? user.handle ?? null,
    avatarUrl: absoluteUrl(user.artistProfile?.avatarUrl ?? user.image),
    role: user.role,
    artistApproved: user.artistProfile?.approved ?? null,
    suspended: user.suspendedAt != null,
    deniedSeed: isDeniedAuthorEmail(user.email),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function listAdminPeople(
  prisma: PrismaClient,
  query: AdminPeopleQuery,
): Promise<Page<AdminPersonRowDTO>> {
  const users = await prisma.user.findMany({
    where: buildAdminPeopleWhere(query),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.take + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    include: { artistProfile: true },
  });

  const hasMore = users.length > query.take;
  const slice = hasMore ? users.slice(0, query.take) : users;
  return {
    items: slice.map(toAdminPersonRow),
    nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export type AdminPersonDetailDTO = {
  user: AdminPersonRowDTO & {
    bio: string | null;
    headline: string | null;
    location: string | null;
    artistBio: string | null;
    termsAcceptedAt: string | null;
    suspendedAt: string | null;
    suspension: { reason: string | null; by: string | null; at: string } | null;
    updatedAt: string;
  };
  counts: {
    posts: number;
    comments: number;
    communityPosts: number;
    following: number;
    followers: number;
    reportsFiled: number;
    reportsReceived: number;
  };
  recentActivity: Array<{
    kind: "post" | "comment" | "community_post";
    id: string;
    text: string | null;
    hidden: boolean;
    createdAt: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    reason: string | null;
    change: { from: string; to: string } | null;
    actor: { id: string; name: string; handle: string | null } | null;
    createdAt: string;
  }>;
};

const AUDIT_TAKE = 30;
const REPORT_SCAN_CAP = 500;
const ACTIVITY_PER_KIND = 5;
const ACTIVITY_TAKE = 10;

function metaObject(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

function metaString(meta: unknown, key: string): string | null {
  const value = metaObject(meta)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export async function getAdminPersonDetail(
  prisma: PrismaClient,
  id: string,
): Promise<AdminPersonDetailDTO | null> {
  const target = await prisma.user.findUnique({
    where: { id },
    include: { artistProfile: true },
  });
  if (!target) return null;

  const profileId = target.artistProfile?.id;

  // Reports about a person include reports on their profile and on what they
  // posted. Ids are capped; an extreme poster still gets an honest lower bound.
  const [postIds, commentIds, communityIds] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: id },
      select: { id: true },
      take: REPORT_SCAN_CAP,
    }),
    prisma.comment.findMany({
      where: { userId: id },
      select: { id: true },
      take: REPORT_SCAN_CAP,
    }),
    prisma.communityPost.findMany({
      where: { authorId: id },
      select: { id: true },
      take: REPORT_SCAN_CAP,
    }),
  ]);
  const receivedWhere: Prisma.ReportWhereInput = {
    OR: [
      { targetType: "USER", targetId: id },
      ...(postIds.length
        ? [{ targetType: "POST" as const, targetId: { in: postIds.map((p) => p.id) } }]
        : []),
      ...(commentIds.length
        ? [{ targetType: "COMMENT" as const, targetId: { in: commentIds.map((c) => c.id) } }]
        : []),
      ...(communityIds.length
        ? [
            {
              targetType: "COMMUNITY_POST" as const,
              targetId: { in: communityIds.map((c) => c.id) },
            },
          ]
        : []),
    ],
  };
  const auditWhere: Prisma.AuditLogWhereInput = {
    // The person's own sign-in and block events are noise here, and blocks are private.
    NOT: [
      { action: { startsWith: "auth." } },
      { action: { startsWith: "block." } },
    ],
    OR: [
      { targetType: "User", targetId: id },
      ...(profileId ? [{ targetType: "ArtistProfile", targetId: profileId }] : []),
      // Suspensions made from the moderation queue point at the reported content.
      { meta: { path: ["suspendedUserId"], equals: id } },
    ],
  };

  const [
    posts,
    comments,
    communityPosts,
    following,
    followers,
    reportsFiled,
    reportsReceived,
    recentPosts,
    recentComments,
    recentCommunity,
    auditRows,
  ] = await Promise.all([
    prisma.post.count({ where: { authorId: id } }),
    prisma.comment.count({ where: { userId: id } }),
    prisma.communityPost.count({ where: { authorId: id } }),
    prisma.follow.count({ where: { followerId: id } }),
    prisma.follow.count({ where: { followingId: id } }),
    prisma.report.count({ where: { reporterId: id } }),
    prisma.report.count({ where: receivedWhere }),
    prisma.post.findMany({
      where: { authorId: id },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PER_KIND,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PER_KIND,
      select: { id: true, body: true, hiddenAt: true, createdAt: true },
    }),
    prisma.communityPost.findMany({
      where: { authorId: id },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PER_KIND,
      select: { id: true, body: true, hiddenAt: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      take: AUDIT_TAKE,
    }),
  ]);

  const actorIds = [
    ...new Set(
      auditRows.map((row) => row.actorId).filter((v): v is string => !!v),
    ),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, handle: true },
      })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  const audit: AdminPersonDetailDTO["audit"] = auditRows.map((row) => {
    const meta = metaObject(row.meta);
    const from = typeof meta.from === "string" ? meta.from : null;
    const to = typeof meta.to === "string" ? meta.to : null;
    const actor = row.actorId ? actorById.get(row.actorId) : undefined;
    return {
      id: row.id,
      action: row.action,
      reason: metaString(row.meta, "reason"),
      change: from && to ? { from, to } : null,
      actor: actor
        ? { id: actor.id, name: actor.name, handle: actor.handle ?? null }
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const recentActivity: AdminPersonDetailDTO["recentActivity"] = [
    ...recentPosts.map((p) => ({
      kind: "post" as const,
      id: p.id,
      text: truncatePreview(p.title),
      hidden: p.status === "ARCHIVED",
      createdAt: p.createdAt,
    })),
    ...recentComments.map((c) => ({
      kind: "comment" as const,
      id: c.id,
      text: truncatePreview(c.body),
      hidden: c.hiddenAt != null,
      createdAt: c.createdAt,
    })),
    ...recentCommunity.map((c) => ({
      kind: "community_post" as const,
      id: c.id,
      text: truncatePreview(c.body),
      hidden: c.hiddenAt != null,
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, ACTIVITY_TAKE)
    .map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));

  let suspension: AdminPersonDetailDTO["user"]["suspension"] = null;
  if (target.suspendedAt) {
    const entry = auditRows.find(
      (row) =>
        row.action === "user.suspend" ||
        (row.action === "moderation.suspend_user" &&
          metaObject(row.meta).suspendedUserId === id),
    );
    const actor = entry?.actorId ? actorById.get(entry.actorId) : undefined;
    suspension = {
      reason: entry ? metaString(entry.meta, "reason") : null,
      by: actor?.name ?? null,
      at: target.suspendedAt.toISOString(),
    };
  }

  return {
    user: {
      ...toAdminPersonRow(target),
      bio: target.bio ?? null,
      headline: target.headline ?? null,
      location: target.location ?? null,
      artistBio: target.artistProfile?.bio ?? null,
      termsAcceptedAt: target.termsAcceptedAt?.toISOString() ?? null,
      suspendedAt: target.suspendedAt?.toISOString() ?? null,
      suspension,
      updatedAt: target.updatedAt.toISOString(),
    },
    counts: {
      posts,
      comments,
      communityPosts,
      following,
      followers,
      reportsFiled,
      reportsReceived,
    },
    recentActivity,
    audit,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const reasonSchema = z
  .string({ error: "Say why, in a few words." })
  .trim()
  .min(3, "Say why, in a few words.")
  .max(200, "Keep the reason under 200 characters.");

export const adminPersonActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_role"),
    role: z.enum(ROLES),
    reason: reasonSchema,
  }),
  z.object({ action: z.literal("approve_artist"), reason: reasonSchema }),
  z.object({ action: z.literal("revoke_artist"), reason: reasonSchema }),
  z.object({ action: z.literal("suspend"), reason: reasonSchema }),
  z.object({ action: z.literal("unsuspend"), reason: reasonSchema }),
  z.object({ action: z.literal("send_sign_in_help"), reason: reasonSchema }),
]);

export type AdminPersonAction = z.infer<typeof adminPersonActionSchema>;

export type AdminPersonActionResult =
  | {
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
    }
  | { ok: true; action: AdminPersonAction["action"]; user: AdminPersonRowDTO };

const ROLE_LABEL: Record<Role, string> = {
  VIEWER: "a member",
  ARTIST: "an artist",
  ADMIN: "an admin",
};

const SIGN_IN_HELP_LIMIT = { windowMs: 60 * 60_000, max: 3 };

function fail(
  code: Extract<AdminPersonActionResult, { ok: false }>["code"],
  message: string,
  extra?: { retryAfterSec?: number },
): AdminPersonActionResult {
  return { ok: false, code, message, ...extra };
}

/**
 * One audited admin action on one person. The caller has already passed
 * `requireAdmin`. Guards: no self-demotion, no self-suspension, no demoting
 * or suspending the last active admin, no touching reserved seed identities.
 */
export async function applyAdminPersonAction(
  prisma: PrismaClient,
  actor: DbUserWithProfile,
  targetId: string,
  raw: unknown,
): Promise<AdminPersonActionResult> {
  const parsed = adminPersonActionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid action",
      fields: zodFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { artistProfile: true },
  });
  if (!target) return fail("not_found", "That account was not found.");

  if (isDeniedAuthorEmail(target.email)) {
    return fail("forbidden", "Reserved seed identities cannot be managed here.");
  }

  const isSelf = target.id === actor.id;
  const row = (patch: Partial<PersonRow>) =>
    toAdminPersonRow({ ...target, ...patch });

  try {
    switch (input.action) {
      case "set_role": {
        if (isSelf && input.role !== "ADMIN") {
          return fail("conflict", "You cannot remove your own admin role.");
        }
        if (input.role === target.role) {
          return fail("conflict", `They are already ${ROLE_LABEL[target.role]}.`);
        }
        if (input.role === "ARTIST" && !target.artistProfile) {
          return fail(
            "conflict",
            "Only people who applied with an artist profile can be made artists.",
          );
        }
        if (target.role === "ADMIN" && input.role !== "ADMIN") {
          const others = await prisma.user.count({
            where: {
              role: "ADMIN",
              suspendedAt: null,
              id: { not: target.id },
            },
          });
          if (others < 1) {
            return fail("conflict", "That is the last admin. Make another admin first.");
          }
        }
        await prisma.user.update({
          where: { id: target.id },
          data: { role: input.role },
        });
        await writeAuditLog(prisma, {
          actorId: actor.id,
          action: "user.role_change",
          targetType: "User",
          targetId: target.id,
          meta: { from: target.role, to: input.role, reason: input.reason },
        });
        return { ok: true, action: input.action, user: row({ role: input.role }) };
      }

      case "approve_artist":
      case "revoke_artist": {
        const profile = target.artistProfile;
        const approve = input.action === "approve_artist";
        if (!profile) {
          return fail("conflict", "That account has no artist profile.");
        }
        if (profile.approved === approve) {
          return fail(
            "conflict",
            approve ? "They are already approved." : "They are not approved.",
          );
        }
        await prisma.artistProfile.update({
          where: { id: profile.id },
          data: { approved: approve },
        });
        let role = target.role;
        if (approve && target.role === "VIEWER") {
          await prisma.user.update({
            where: { id: target.id },
            data: { role: "ARTIST" },
          });
          role = "ARTIST";
        }
        await writeAuditLog(prisma, {
          actorId: actor.id,
          action: approve ? "artist.approve" : "artist.revoke",
          targetType: "ArtistProfile",
          targetId: profile.id,
          meta: {
            userId: target.id,
            handle: profile.handle,
            reason: input.reason,
            via: "admin/people",
          },
        });
        return {
          ok: true,
          action: input.action,
          user: row({
            role,
            artistProfile: { ...profile, approved: approve },
          }),
        };
      }

      case "suspend": {
        if (isSelf) return fail("conflict", "You cannot suspend yourself.");
        if (target.role === "ADMIN") {
          return fail(
            "conflict",
            "Admins cannot be suspended. Change their role first.",
          );
        }
        if (target.suspendedAt) {
          return fail("conflict", "They are already suspended.");
        }
        const at = new Date();
        await prisma.user.update({
          where: { id: target.id },
          data: { suspendedAt: at },
        });
        await writeAuditLog(prisma, {
          actorId: actor.id,
          action: "user.suspend",
          targetType: "User",
          targetId: target.id,
          meta: { reason: input.reason },
        });
        return { ok: true, action: input.action, user: row({ suspendedAt: at }) };
      }

      case "unsuspend": {
        if (!target.suspendedAt) {
          return fail("conflict", "They are not suspended.");
        }
        await prisma.user.update({
          where: { id: target.id },
          data: { suspendedAt: null },
        });
        await writeAuditLog(prisma, {
          actorId: actor.id,
          action: "user.unsuspend",
          targetType: "User",
          targetId: target.id,
          meta: { reason: input.reason },
        });
        return { ok: true, action: input.action, user: row({ suspendedAt: null }) };
      }

      case "send_sign_in_help": {
        const limit = checkRateLimit(
          `v1:admin:sign-in-help:${target.id}`,
          SIGN_IN_HELP_LIMIT,
        );
        if (!limit.ok) {
          return fail("rate_limited", "A code was just sent. Give it a few minutes.", {
            retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
          });
        }
        // Same emailed-code path as "Returning door": the person gets the
        // code in their own inbox, the admin never sees it.
        const issued = await issueSignInChallenge(prisma, target.email);
        if (!issued.ok) {
          return fail(
            "upstream_unavailable",
            "Could not send a sign-in code just now. Try again in a moment.",
          );
        }
        await writeAuditLog(prisma, {
          actorId: actor.id,
          action: "user.sign_in_help",
          targetType: "User",
          targetId: target.id,
          meta: { reason: input.reason },
        });
        return { ok: true, action: input.action, user: row({}) };
      }
    }
  } catch (error) {
    console.error("[applyAdminPersonAction]", error);
    return fail("upstream_unavailable", "Could not apply that just now.");
  }
}
