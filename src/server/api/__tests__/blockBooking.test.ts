// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { blockBooking, type BlockBookingConfig } from "@/content/booking";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { bookBlock, cancelBlock, listBlockBoard } from "@/server/api/blockBooking";

type Row = {
  id: string;
  userId: string;
  day: string;
  blockIndex: number;
  startsAt: Date;
  endsAt: Date;
};

/** In-memory stand-in for the slice of Prisma the booking service uses. */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  const match = (r: Row, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([k, v]) => {
      const value = r[k as keyof Row];
      if (v && typeof v === "object" && "in" in (v as object)) {
        return ((v as { in: unknown[] }).in).includes(value);
      }
      if (v && typeof v === "object" && "gt" in (v as object)) {
        return (value as Date).getTime() > ((v as { gt: Date }).gt).getTime();
      }
      return value === v;
    });
  const blockBookingApi = {
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      rows.filter((r) => match(r, where)),
    count: async ({ where }: { where: Record<string, unknown> }) =>
      rows.filter((r) => match(r, where)).length,
    findUnique: async ({
      where,
    }: {
      where: { day_blockIndex_userId: { day: string; blockIndex: number; userId: string } };
    }) => {
      const k = where.day_blockIndex_userId;
      return (
        rows.find(
          (r) => r.day === k.day && r.blockIndex === k.blockIndex && r.userId === k.userId,
        ) ?? null
      );
    },
    create: async ({ data }: { data: Omit<Row, "id"> }) => {
      const row = { ...data, id: `bk_${(seq += 1)}` };
      rows.push(row);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const i = rows.findIndex((r) => r.id === where.id);
      return rows.splice(i, 1)[0];
    },
  };
  const client = {
    blockBooking: blockBookingApi,
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: async (run: (tx: unknown) => unknown) => run(client),
  };
  return { prisma: client as unknown as PrismaClient, rows };
}

const NOW = new Date("2026-11-12T14:00:00Z"); // 9 AM New York, Nov 12
const ada = { id: "ada", name: "Ada" };
const bo = { id: "bo", name: "Bo" };

let env: ReturnType<typeof fakePrisma>;
beforeEach(() => {
  resetRateLimits();
  env = fakePrisma();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const book = (
  who: { id: string; name: string },
  day: string,
  index: number,
  config: BlockBookingConfig = blockBooking,
) => bookBlock(env.prisma, who, { day, index }, NOW, config);

describe("bookBlock", () => {
  it("books a block and shows it as mine with no spots left", async () => {
    const res = await book(ada, "2026-11-13", 0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.block).toMatchObject({ mine: true, taken: 1, left: 0, capacity: 1 });
    expect(env.rows).toHaveLength(1);
    expect(env.rows[0]!.startsAt.toISOString()).toBe("2026-11-13T16:00:00.000Z");
  });

  it("refuses a full block with a friendly message", async () => {
    await book(ada, "2026-11-13", 0);
    const res = await book(bo, "2026-11-13", 0);
    expect(res).toMatchObject({ ok: false, code: "conflict" });
    if (!res.ok) expect(res.message).toMatch(/filled up/);
    expect(env.rows).toHaveLength(1);
  });

  it("lets more than one act in when capacity is raised", async () => {
    const cfg = { ...blockBooking, capacityPerBlock: 2 };
    expect((await book(ada, "2026-11-13", 0, cfg)).ok).toBe(true);
    expect((await book(bo, "2026-11-13", 0, cfg)).ok).toBe(true);
    const third = await book({ id: "cy", name: "Cy" }, "2026-11-13", 0, cfg);
    expect(third.ok).toBe(false);
  });

  it("refuses booking the same block twice", async () => {
    await book(ada, "2026-11-13", 0);
    const again = await book(ada, "2026-11-13", 0);
    expect(again).toMatchObject({ ok: false, code: "conflict" });
    if (!again.ok) expect(again.message).toMatch(/already have/);
  });

  it("caps one block per person per day", async () => {
    await book(ada, "2026-11-13", 0);
    const second = await book(ada, "2026-11-13", 1);
    expect(second).toMatchObject({ ok: false, code: "conflict" });
    if (!second.ok) expect(second.message).toMatch(/One block per day/);
    // A different day is fine.
    expect((await book(ada, "2026-11-14", 0)).ok).toBe(true);
  });

  it("caps three upcoming bookings at once", async () => {
    expect((await book(ada, "2026-11-13", 0)).ok).toBe(true);
    expect((await book(ada, "2026-11-14", 0)).ok).toBe(true);
    expect((await book(ada, "2026-11-15", 0)).ok).toBe(true);
    const fourth = await book(ada, "2026-11-16", 0);
    expect(fourth).toMatchObject({ ok: false, code: "conflict" });
    if (!fourth.ok) expect(fourth.message).toMatch(/3 upcoming blocks/);
    expect(env.rows).toHaveLength(3);
  });

  it("does not count past bookings toward the upcoming cap", async () => {
    const past = new Date("2026-11-01T15:00:00Z");
    for (let i = 0; i < 5; i += 1) {
      env.rows.push({
        id: `old${i}`,
        userId: ada.id,
        day: `2026-11-0${i + 1}`,
        blockIndex: 0,
        startsAt: past,
        endsAt: new Date(past.getTime() + 4 * 3_600_000),
      });
    }
    expect((await book(ada, "2026-11-13", 0)).ok).toBe(true);
  });

  it("honors configurable caps", async () => {
    const cfg = { ...blockBooking, maxBlocksPerPersonPerDay: 2, maxUpcomingPerPerson: 2 };
    expect((await book(ada, "2026-11-13", 0, cfg)).ok).toBe(true);
    expect((await book(ada, "2026-11-13", 1, cfg)).ok).toBe(true);
    const third = await book(ada, "2026-11-14", 0, cfg);
    expect(third).toMatchObject({ ok: false, code: "conflict" });
  });

  it("refuses a block that has started or is outside the window", async () => {
    const started = await book(ada, "2026-11-12", 0); // 11 AM, now is 9 AM -> open
    expect(started.ok).toBe(true);
    const late = bookBlock(env.prisma, bo, { day: "2026-11-12", index: 0 }, new Date("2026-11-12T16:00:00Z"));
    expect(await late).toMatchObject({ ok: false, code: "conflict" });
    expect(await book(bo, "2027-03-01", 0)).toMatchObject({ ok: false, code: "not_found" });
    expect(await book(bo, "2026-11-13", 7)).toMatchObject({ ok: false, code: "not_found" });
  });

  it("validates the body", async () => {
    const res = await bookBlock(env.prisma, ada, { day: "tomorrow" }, NOW);
    expect(res).toMatchObject({ ok: false, code: "validation_failed" });
  });
});

describe("cancelBlock", () => {
  it("frees the spot so someone else can book it", async () => {
    await book(ada, "2026-11-13", 0);
    expect((await book(bo, "2026-11-13", 0)).ok).toBe(false);
    const cancelled = await cancelBlock(env.prisma, ada, { day: "2026-11-13", index: 0 }, NOW);
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) expect(cancelled.data.block).toMatchObject({ mine: false, left: 1 });
    expect((await book(bo, "2026-11-13", 0)).ok).toBe(true);
  });

  it("frees the person's own caps", async () => {
    await book(ada, "2026-11-13", 0);
    await book(ada, "2026-11-14", 0);
    await book(ada, "2026-11-15", 0);
    expect((await book(ada, "2026-11-16", 0)).ok).toBe(false);
    await cancelBlock(env.prisma, ada, { day: "2026-11-15", index: 0 }, NOW);
    expect((await book(ada, "2026-11-16", 0)).ok).toBe(true);
  });

  it("only cancels my own booking", async () => {
    await book(ada, "2026-11-13", 0);
    const res = await cancelBlock(env.prisma, bo, { day: "2026-11-13", index: 0 }, NOW);
    expect(res).toMatchObject({ ok: false, code: "conflict" });
    expect(env.rows).toHaveLength(1);
  });

  it("will not cancel a block that already started", async () => {
    await book(ada, "2026-11-12", 0);
    const res = await cancelBlock(
      env.prisma,
      ada,
      { day: "2026-11-12", index: 0 },
      new Date("2026-11-12T16:00:00Z"),
    );
    expect(res).toMatchObject({ ok: false, code: "conflict" });
    expect(env.rows).toHaveLength(1);
  });
});

describe("listBlockBoard", () => {
  it("shows 14 days of 3 blocks with spots left and what I hold", async () => {
    await book(ada, "2026-11-13", 1);
    await book(bo, "2026-11-13", 2);
    const res = await listBlockBoard(env.prisma, ada, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.days).toHaveLength(14);
    expect(res.data.days.every((d) => d.blocks.length === 3)).toBe(true);
    const day = res.data.days.find((d) => d.day === "2026-11-13")!;
    expect(day.blocks.map((b) => [b.left, b.mine])).toEqual([
      [1, false],
      [0, true],
      [0, false],
    ]);
    expect(res.data.upcomingMine).toBe(1);
    expect(res.data.limits).toEqual({
      maxBlocksPerPersonPerDay: 1,
      maxUpcomingPerPerson: 3,
      capacityPerBlock: 1,
    });
  });
});
