"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";
import type { BlockBoardDTO, BlockDTO } from "@/server/api/blockBooking";

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type Load =
  | { state: "loading" }
  | { state: "blocked"; message: string; signIn: boolean }
  | { state: "error"; message: string }
  | { state: "ready"; board: BlockBoardDTO };

export function formatBlockRange(
  block: Pick<BlockDTO, "startsAt" | "endsAt">,
  timeZone: string,
): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(block.startsAt))} – ${fmt.format(new Date(block.endsAt))}`;
}

function formatDay(day: string): string {
  // Noon UTC keeps the weekday stable in every zone.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

async function call<T>(
  method: "GET" | "POST" | "DELETE",
  body?: { day: string; index: number },
): Promise<Envelope<T> & { status: number }> {
  const response = await fetch("/api/v1/signup-blocks", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!json) {
    return {
      ok: false,
      error: { code: "internal", message: "Something went wrong. Try again." },
      status: response.status,
    };
  }
  return { ...json, status: response.status };
}

export function BlockBooker() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await call<BlockBoardDTO>("GET");
      if (result.ok) {
        setLoad({ state: "ready", board: result.data });
      } else if (result.status === 401) {
        setLoad({ state: "blocked", message: result.error.message, signIn: true });
      } else if (result.status === 403) {
        setLoad({ state: "blocked", message: result.error.message, signIn: false });
      } else {
        setLoad({ state: "error", message: result.error.message });
      }
    } catch {
      setLoad({ state: "error", message: "Could not reach the house. Check your connection." });
    }
  }, []);

  useEffect(() => {
    // Initial fetch of the board; state is set when the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function act(block: BlockDTO) {
    setBusy(block.id);
    setNotice(null);
    try {
      const result = await call<{ block: BlockDTO }>(block.mine ? "DELETE" : "POST", {
        day: block.day,
        index: block.index,
      });
      if (result.ok) {
        setNotice({
          tone: "ok",
          text: block.mine ? "Cancelled. The spot is open again." : "You're booked. See you on the stage.",
        });
      } else {
        setNotice({ tone: "bad", text: result.error.message });
      }
      await refresh();
    } catch {
      setNotice({ tone: "bad", text: "Could not reach the house. Try again." });
    } finally {
      setBusy(null);
    }
  }

  if (load.state === "loading") {
    return <p className="text-sm text-paper-muted" role="status">Loading the next two weeks…</p>;
  }
  if (load.state === "error") {
    return (
      <p className="text-sm text-paper" role="alert">
        {load.message}{" "}
        <button type="button" className="text-spark-teal underline" onClick={() => void refresh()}>
          Try again
        </button>
      </p>
    );
  }
  if (load.state === "blocked") {
    return (
      <section
        data-testid="blocks-blocked"
        className="rounded-3xl border border-line bg-surface-glass p-6 sm:p-8"
      >
        <p className="max-w-xl text-sm text-paper">{load.message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={load.signIn ? "/join" : "/get-involved"}
            className="inline-flex min-h-11 items-center rounded-full bg-spark-coral px-5 text-sm font-semibold text-ink"
          >
            {load.signIn ? "Sign in" : "How to get approved"}
          </Link>
        </div>
      </section>
    );
  }

  const { board } = load;
  const { limits } = board;
  const atUpcomingCap = board.upcomingMine >= limits.maxUpcomingPerPerson;

  return (
    <div data-testid="block-booker">
      <p className="text-sm text-paper-muted">
        You hold {board.upcomingMine} of {limits.maxUpcomingPerPerson} upcoming blocks. Up to{" "}
        {limits.maxBlocksPerPersonPerDay} per day keeps the stage fair for everyone.
      </p>
      {notice ? (
        <p
          role={notice.tone === "bad" ? "alert" : "status"}
          className={cn(
            "mt-4 rounded-2xl border px-4 py-3 text-sm",
            notice.tone === "bad"
              ? "border-spark-coral text-paper"
              : "border-spark-teal text-paper",
          )}
        >
          {notice.text}
        </p>
      ) : null}
      <ol className="mt-6 space-y-6">
        {board.days.map((d) => (
          <li key={d.day}>
            <h2 className="display text-xl text-paper">{formatDay(d.day)}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {d.blocks.map((b) => {
                const full = !b.mine && b.left === 0;
                const canAct = busy === null && b.open && (b.mine || (!full && !atUpcomingCap));
                return (
                  <li
                    key={b.id}
                    data-testid={`block-${b.id}`}
                    className={cn(
                      "rounded-2xl border bg-surface-glass p-4",
                      b.mine ? "border-spark-teal" : "border-line",
                    )}
                  >
                    <p className="text-sm font-semibold text-paper">
                      {formatBlockRange(b, board.timeZone)}
                    </p>
                    <p className="mt-1 text-xs text-paper-muted">
                      {b.mine
                        ? "You're booked"
                        : !b.open
                          ? "Closed"
                          : full
                            ? "Full"
                            : `${b.left} of ${b.capacity} open`}
                    </p>
                    {b.open || b.mine ? (
                      <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => void act(b)}
                        className={cn(
                          "mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-50",
                          b.mine
                            ? "border border-line text-paper hover:border-spark-coral"
                            : "bg-spark-coral text-ink",
                        )}
                      >
                        {busy === b.id ? "Saving…" : b.mine ? "Cancel" : "Book this block"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
