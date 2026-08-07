"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  ChevronDown,
  LayoutList,
  CalendarDays,
} from "lucide-react";
import { events, googleCalendarUrl, type ScheduleEvent } from "@/data/events";
import { copy, links } from "@/content/site";
import { ButtonLink } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

type ViewMode = "list" | "calendar";

function formatRange(event: ScheduleEvent) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const date = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const t = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${t(start)} – ${t(end)}`;
}

export function ScheduleView() {
  const [mode, setMode] = useState<ViewMode>("list");
  const [openId, setOpenId] = useState<string | null>(events[0]?.id ?? null);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const key = new Date(e.start).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-paper-muted">{copy.schedule.supportLine}</p>
        <div
          className="inline-flex rounded-full border border-line bg-surface-glass p-1"
          role="group"
          aria-label="Schedule view"
        >
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
              mode === "list"
                ? "bg-spark-teal text-ink"
                : "text-paper-muted hover:text-paper",
            )}
            aria-pressed={mode === "list"}
            onClick={() => setMode("list")}
          >
            <LayoutList className="h-4 w-4" aria-hidden />
            List
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
              mode === "calendar"
                ? "bg-spark-teal text-ink"
                : "text-paper-muted hover:text-paper",
            )}
            aria-pressed={mode === "calendar"}
            onClick={() => setMode("calendar")}
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            Calendar
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <ul className="space-y-3">
          {events.map((event) => {
            const open = openId === event.id;
            return (
              <li
                key={event.id}
                className="overflow-hidden rounded-2xl border border-line bg-surface-glass"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : event.id)}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
                      {event.medium}
                      {event.comingSoon ? " · Coming soon" : ""}
                    </p>
                    <p className="display mt-1 text-xl text-paper sm:text-2xl">
                      {event.title}
                    </p>
                    <p className="mt-1 text-sm text-paper-muted">
                      {formatRange(event)}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 text-paper-muted transition",
                      open && "rotate-180 text-spark-teal",
                    )}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-line px-4 pb-5 pt-3 sm:px-5">
                        <p className="text-sm text-paper-muted">
                          {event.artist} · {event.venue}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-paper">
                          {event.description}
                        </p>
                        <a
                          href={googleCalendarUrl(event)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-paper transition hover:border-spark-teal hover:text-spark-teal"
                        >
                          <CalendarPlus className="h-4 w-4" aria-hidden />
                          Add to Google Calendar
                        </a>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byDay.map(([day, dayEvents]) => (
            <div
              key={day}
              className="rounded-2xl border border-line bg-surface-glass p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-spark-coral">
                {new Date(day + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <ul className="mt-3 space-y-3">
                {dayEvents.map((e) => (
                  <li
                    key={e.id}
                    className="border-t border-line pt-3 first:border-0 first:pt-0"
                  >
                    <p className="font-semibold text-paper">{e.title}</p>
                    <p className="mt-1 text-xs text-paper-muted">
                      {new Date(e.start).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-line bg-ink-elevated p-6 sm:p-8">
        <h2 className="display text-2xl text-paper">{copy.schedule.ready}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-glass p-4">
            <p className="text-sm font-semibold text-paper">
              {copy.schedule.step1}
            </p>
            <ButtonLink
              href={links.artistAgreement}
              external
              variant="secondary"
              className="mt-4 w-full rounded-full"
            >
              {copy.schedule.step1Cta}
            </ButtonLink>
          </div>
          <div className="rounded-2xl border border-line bg-surface-glass p-4">
            <p className="text-xs text-paper-muted">
              {copy.schedule.step2Lead}
            </p>
            <p className="mt-2 text-sm font-semibold text-paper">
              {copy.schedule.step2}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
