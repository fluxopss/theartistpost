"use client";

import { useEffect, useState } from "react";

const TZ = "America/New_York";
const OPEN_MINUTES = 9 * 60; // 09:00
const CLOSE_MINUTES = 21 * 60 + 30; // 21:30

function minutesInTz(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function isOpenNow(date = new Date()): boolean {
  const m = minutesInTz(date);
  return m >= OPEN_MINUTES && m < CLOSE_MINUTES;
}

export function useOpenStatus() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => {
      setOpen(isOpenNow());
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
    hoursLabel: "09:00 am – 09:30 pm",
  };
}
