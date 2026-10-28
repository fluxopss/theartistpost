"use client";

import { useEffect, useState } from "react";
import { houseSchedule } from "@/content/site";
import { isOpenAt, opensLabel, todayLabel } from "@/lib/hours";

/** Is Hacienda open right now (Eastern time), per the weekly schedule in site.ts. */
export function isOpenNow(date = new Date()): boolean {
  return isOpenAt(houseSchedule, date);
}

export function useOpenStatus() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [opens, setOpens] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setOpen(isOpenNow(now));
      setToday(todayLabel(houseSchedule, now));
      setOpens(opensLabel(houseSchedule, now));
      setReady(true);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return {
    open,
    ready,
    // The server render (and first client render) is neutral; the real state
    // arrives after mount, so the HTML never disagrees with the browser clock.
    label: open ? "Open now" : (opens ?? "Closed"),
    /** Today's window once mounted (client clock), e.g. "11 AM – Midnight". */
    hoursLabel: ready ? `Today ${today}` : "",
  };
}
