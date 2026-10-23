"use client";

import { useEffect, useState } from "react";
import { houseSchedule } from "@/content/site";
import { isOpenAt, todayLabel } from "@/lib/hours";

/** Is Hacienda open right now (Eastern time), per the weekly schedule in site.ts. */
export function isOpenNow(date = new Date()): boolean {
  return isOpenAt(houseSchedule, date);
}

export function useOpenStatus() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setOpen(isOpenNow(now));
      setToday(todayLabel(houseSchedule, now));
      setReady(true);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return {
    open,
    ready,
    label: open ? "Open now" : "Closed",
    /** Today's window once mounted (client clock), e.g. "11 AM – Midnight". */
    hoursLabel: ready ? `Today ${today}` : "",
  };
}
