import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { blockBooking, type BlockBookingConfig } from "@/content/booking";
import { checkRateLimit } from "@/features/auth/rateLimit";
import { writeAuditLog } from "@/features/posts/audit";
import {
  blocksForDay,
  findBlock,
  windowDays,
  type DayBlock,
} from "@/server/api/blockSchedule";
import type { EventFailure } from "@/server/api/eventResult";
import { zodFieldErrors } from "@/server/api/validation";

export type BlockDTO = {
  /** Stable key, "YYYY-MM-DD#index". */
  id: string;
  day: string;
  index: number;
  startsAt: string;
  endsAt: string;
  capacity: number;
  taken: number;
  left: number;
  mine: boolean;
  /** Still in the future, so it can be booked or cancelled. */
  open: boolean;
};

export type BlockBoardDTO = {
  timeZone: string;
  days: { day: string; blocks: BlockDTO[] }[];
  limits: {
    maxBlocksPerPersonPerDay: number;
    maxUpcomingPerPerson: number;
    capacityPerBlock: number;
  };
  /** How many future bookings this person holds right now. */
  upcomingMine: number;
};

type Person = { id: string; name: string };
type Ok<T> = { ok: true; data: T };

export const blockKeySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day from the list."),
  index: z
    .number()
    .int("Pick a block from the list.")
    .min(0, "Pick a block from the list.")
    .max(23, "Pick a block from the list."),
});

const NOT_A_BLOCK: EventFailure = {
  ok: false,
  code: "not_found",
  message: "That block is not open for sign-up. Pick one from the next two weeks.",
};

export function blockId(block: Pick<DayBlock, "day" | "index">): string {
  return `${block.day}#${block.index}`;
}

function toBlockDTO(
  block: DayBlock,
  taken: number,
  mine: boolean,
  now: Date,
  config: BlockBookingConfig,
): BlockDTO {
  return {
    id: blockId(block),
    day: block.day,
    index: block.index,
    startsAt: block.startsAt.toISOString(),
    endsAt: block.endsAt.toISOString(),
    capacity: config.capacityPerBlock,
    taken,
    left: Math.max(0, config.capacityPerBlock - taken),
    mine,
    open: block.startsAt.getTime() > now.getTime(),
  };
}

/** The next `horizonDays` of blocks with spots left and what I hold. */
export async function listBlockBoard(
  prisma: PrismaClient,
  person: Person,
  now = new Date(),
  config: BlockBookingConfig = blockBooking,
): Promise<Ok<BlockBoardDTO> | EventFailure> {
  try {
    const days = windowDays(now, config);
    const [rows, upcomingMine] = await Promise.all([
      prisma.blockBooking.findMany({
        where: { day: { in: days } },
        select: { day: true, blockIndex: true, userId: true },
      }),
      prisma.blockBooking.count({
        where: { userId: person.id, endsAt: { gt: now } },
      }),
    ]);
    const taken = new Map<string, number>();
    const mine = new Set<string>();
    for (const row of rows) {
      const key = blockId({ day: row.day, index: row.blockIndex });
      taken.set(key, (taken.get(key) ?? 0) + 1);
      if (row.userId === person.id) mine.add(key);
    }
    return {
      ok: true,
      data: {
        timeZone: config.timeZone,
        days: days.map((day) => ({
          day,
          blocks: blocksForDay(day, config).map((b) =>
            toBlockDTO(b, taken.get(blockId(b)) ?? 0, mine.has(blockId(b)), now, config),
          ),
        })),
        limits: {
          maxBlocksPerPersonPerDay: config.maxBlocksPerPersonPerDay,
          maxUpcomingPerPerson: config.maxUpcomingPerPerson,
          capacityPerBlock: config.capacityPerBlock,
        },
        upcomingMine,
      },
    };
  } catch (error) {
    console.error("[listBlockBoard]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not load the sign-up blocks. Try again in a moment.",
    };
  }
}

async function inSerializableTx<T>(
  prisma: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
}

function parseKey(raw: unknown): { day: string; index: number } | EventFailure {
  const parsed = blockKeySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Pick a block from the list.",
      fields: zodFieldErrors(parsed.error),
    };
  }
  return parsed.data;
}

function rateLimited(personId: string): EventFailure | null {
  const limit = checkRateLimit(`v1:block-booking:${personId}`, {
    windowMs: 10 * 60_000,
    max: 30,
  });
  return limit.ok
    ? null
    : {
        ok: false,
        code: "rate_limited",
        message: "Slow down a little.",
        retryAfterSec: Math.max(1, Math.ceil(limit.retryAfterMs / 1000)),
      };
}

class RuleBreak extends Error {
  constructor(readonly failure: EventFailure) {
    super(failure.message);
  }
}

const conflict = (message: string): RuleBreak =>
  new RuleBreak({ ok: false, code: "conflict", message });

/**
 * Book a block. Every rule is checked inside one serializable transaction,
 * so two people cannot take the last spot and nobody can slip past a cap by
 * double-tapping. Callers must already have passed the approved-artist gate.
 */
export async function bookBlock(
  prisma: PrismaClient,
  person: Person,
  raw: unknown,
  now = new Date(),
  config: BlockBookingConfig = blockBooking,
): Promise<Ok<{ block: BlockDTO }> | EventFailure> {
  const key = parseKey(raw);
  if ("ok" in key) return key;
  const limited = rateLimited(person.id);
  if (limited) return limited;

  const block = findBlock(key.day, key.index, now, config);
  if (!block) return NOT_A_BLOCK;
  if (block.startsAt.getTime() <= now.getTime()) {
    return {
      ok: false,
      code: "conflict",
      message: "That block has already started. Pick a later one.",
    };
  }

  try {
    const taken = await inSerializableTx(prisma, async (tx) => {
      const where = { day: block.day, blockIndex: block.index };
      const already = await tx.blockBooking.findUnique({
        where: { day_blockIndex_userId: { ...where, userId: person.id } },
      });
      if (already) throw conflict("You already have this block.");

      const [filled, mineToday, mineUpcoming] = await Promise.all([
        tx.blockBooking.count({ where }),
        tx.blockBooking.count({ where: { userId: person.id, day: block.day } }),
        tx.blockBooking.count({
          where: { userId: person.id, endsAt: { gt: now } },
        }),
      ]);
      if (filled >= config.capacityPerBlock) {
        throw conflict(
          "That block just filled up. Pick another one — new spots open when someone cancels.",
        );
      }
      if (mineToday >= config.maxBlocksPerPersonPerDay) {
        throw conflict(
          config.maxBlocksPerPersonPerDay === 1
            ? "One block per day keeps the stage fair for everyone. Pick a different day."
            : `You can hold up to ${config.maxBlocksPerPersonPerDay} blocks a day. Pick a different day.`,
        );
      }
      if (mineUpcoming >= config.maxUpcomingPerPerson) {
        throw conflict(
          `You are holding ${config.maxUpcomingPerPerson} upcoming blocks, the most at once. Cancel one or wait until one has passed to book another.`,
        );
      }
      await tx.blockBooking.create({
        data: {
          userId: person.id,
          day: block.day,
          blockIndex: block.index,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
        },
      });
      return filled + 1;
    });

    await writeAuditLog(prisma, {
      actorId: person.id,
      action: "block.book",
      targetType: "BlockBooking",
      targetId: blockId(block),
    }).catch((error) => console.error("[bookBlock audit]", error));

    return {
      ok: true,
      data: { block: toBlockDTO(block, taken, true, now, config) },
    };
  } catch (error) {
    if (error instanceof RuleBreak) return error.failure;
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, code: "conflict", message: "You already have this block." };
    }
    console.error("[bookBlock]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not save your booking. Try again in a moment.",
    };
  }
}

/** Cancel my own booking; the spot goes straight back to the board. */
export async function cancelBlock(
  prisma: PrismaClient,
  person: Person,
  raw: unknown,
  now = new Date(),
  config: BlockBookingConfig = blockBooking,
): Promise<Ok<{ block: BlockDTO }> | EventFailure> {
  const key = parseKey(raw);
  if ("ok" in key) return key;
  const limited = rateLimited(person.id);
  if (limited) return limited;

  const block = blocksForDay(key.day, config).find((b) => b.index === key.index);
  if (!block) return NOT_A_BLOCK;

  try {
    const outcome = await inSerializableTx(prisma, async (tx) => {
      const mine = await tx.blockBooking.findUnique({
        where: {
          day_blockIndex_userId: {
            day: block.day,
            blockIndex: block.index,
            userId: person.id,
          },
        },
      });
      if (!mine) throw conflict("You do not have this block booked.");
      if (block.startsAt.getTime() <= now.getTime()) {
        throw conflict(
          "That block has already started, so it can't be cancelled here. Message the house team.",
        );
      }
      await tx.blockBooking.delete({ where: { id: mine.id } });
      return tx.blockBooking.count({
        where: { day: block.day, blockIndex: block.index },
      });
    });

    await writeAuditLog(prisma, {
      actorId: person.id,
      action: "block.cancel",
      targetType: "BlockBooking",
      targetId: blockId(block),
    }).catch((error) => console.error("[cancelBlock audit]", error));

    return {
      ok: true,
      data: { block: toBlockDTO(block, outcome, false, now, config) },
    };
  } catch (error) {
    if (error instanceof RuleBreak) return error.failure;
    console.error("[cancelBlock]", error);
    return {
      ok: false,
      code: "upstream_unavailable",
      message: "Could not cancel. Try again in a moment.",
    };
  }
}
