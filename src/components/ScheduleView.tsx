"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Download,
  LayoutList,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ContentEvent } from "@/lib/content";
import {
  downloadIcs,
  googleCalendarUrl,
  monthMatrix,
  sameDay,
} from "@/lib/schedule/calendar";
import { copy, links } from "@/content/site";
import { Accordion } from "@/design-system/primitives/Accordion";
import { Button, ButtonLink } from "@/design-system/primitives/Button";
import { Tabs } from "@/design-system/primitives/Tabs";
import { Modal } from "@/design-system/primitives/Modal";
import { cn } from "@/shared/lib/cn";

type ViewMode = "list" | "calendar" | "agenda";

function formatRange(event: ContentEvent) {
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

export function ScheduleView({ events }: { events: ContentEvent[] }) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [cursor, setCursor] = useState(() => {
    const first = events[0] ? new Date(events[0].start) : new Date();
    return { year: first.getFullYear(), month: first.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const byDay = useMemo(() => {
    const map = new Map<string, ContentEvent[]>();
    for (const e of events) {
      const key = new Date(e.start).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const cells = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor],
  );

  const dayEvents = selectedDay
    ? events.filter(
        (e) => new Date(e.start).toISOString().slice(0, 10) === selectedDay,
      )
    : [];

  const accordionItems = events.map((event) => ({
    id: event.id,
    title: (
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
          {event.medium}
          {event.comingSoon ? " · Coming soon" : ""}
        </span>
        <span className="display mt-1 block text-xl text-paper sm:text-2xl">
          {event.title}
        </span>
      </span>
    ),
    subtitle: formatRange(event),
    content: (
      <EventActions event={event} />
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-paper-muted">{copy.schedule.supportLine}</p>
        <Tabs
          label="Schedule view"
          value={mode}
          onChange={(id) => setMode(id as ViewMode)}
          items={[
            { id: "list", label: "List", icon: <LayoutList className="h-4 w-4" aria-hidden /> },
            { id: "calendar", label: "Month", icon: <CalendarDays className="h-4 w-4" aria-hidden /> },
            { id: "agenda", label: "Agenda" },
          ]}
        />
      </div>

      {mode === "list" ? (
        <Accordion items={accordionItems} defaultOpenId={events[0]?.id} />
      ) : null}

      {mode === "agenda" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byDay.map(([day, dayEv]) => (
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
                {dayEv.map((e) => (
                  <li
                    key={e.id}
                    className="border-t border-line pt-3 first:border-0 first:pt-0"
                  >
                    <Link
                      href={`/event/${e.id}`}
                      className="font-semibold text-paper hover:text-spark-teal"
                    >
                      {e.title}
                    </Link>
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
      ) : null}

      {mode === "calendar" ? (
        <div className="rounded-3xl border border-line bg-surface-glass p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
              aria-label="Previous month"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="display text-xl text-paper">
              {new Date(cursor.year, cursor.month, 1).toLocaleDateString(
                "en-US",
                { month: "long", year: "numeric" },
              )}
            </p>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
              aria-label="Next month"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-paper-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="min-h-16 rounded-lg" />;
              }
              const key = cell.date.toISOString().slice(0, 10);
              const hits = events.filter((e) =>
                sameDay(new Date(e.start), cell.date!),
              );
              const selected = selectedDay === key;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    "min-h-16 rounded-lg border p-1.5 text-left transition",
                    selected
                      ? "border-spark-teal bg-spark-teal/15"
                      : "border-line bg-surface-muted/40 hover:border-line-strong",
                  )}
                >
                  <span className="text-xs font-semibold text-paper">
                    {cell.date.getDate()}
                  </span>
                  {hits.length > 0 ? (
                    <span className="mt-1 block truncate text-[10px] text-spark-gold">
                      {hits.length} event{hits.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {selectedDay ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-semibold text-paper">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "long", day: "numeric" },
                )}
              </p>
              {dayEvents.length === 0 ? (
                <p className="mt-2 text-sm text-paper-muted">No events this day.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dayEvents.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/event/${e.id}`}
                        className="text-sm font-medium text-spark-teal hover:underline"
                      >
                        {e.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-3xl border border-line bg-ink-elevated p-6 sm:p-8">
        <h2 className="display text-2xl text-paper">{copy.schedule.ready}</h2>
        <p className="mt-2 text-sm text-paper-muted">
          Multi-step onboarding — review the agreement, then wait for your
          scheduling link after approval.
        </p>
        <Button
          variant="secondary"
          className="mt-5 rounded-full"
          onClick={() => {
            setWizardStep(0);
            setOnboarding(true);
          }}
        >
          Start artist onboarding
        </Button>
      </div>

      <Modal
        open={onboarding}
        onOpenChange={setOnboarding}
        title="Artist onboarding"
        description={`Step ${wizardStep + 1} of 3`}
      >
        {wizardStep === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-paper-muted">{copy.schedule.step1}</p>
            <ButtonLink
              href={links.artistAgreement}
              external
              variant="secondary"
              className="w-full rounded-full"
            >
              {copy.schedule.step1Cta} — open agreement
            </ButtonLink>
            <Button
              className="w-full rounded-full"
              onClick={() => setWizardStep(1)}
            >
              I opened / signed the agreement
            </Button>
          </div>
        ) : null}
        {wizardStep === 1 ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-paper">
              {copy.schedule.step2Lead}
            </p>
            <p className="text-sm text-paper-muted">{copy.schedule.step2}</p>
            <Button
              className="w-full rounded-full"
              onClick={() => setWizardStep(2)}
            >
              Continue
            </Button>
          </div>
        ) : null}
        {wizardStep === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-paper-muted">
              You&apos;re on the list. After approval, Robbie will send your
              scheduling link. Questions?{" "}
              <a
                href="mailto:Robbie@theartistpost.org"
                className="text-spark-teal underline"
              >
                Email Robbie
              </a>
              .
            </p>
            <Button
              variant="secondary"
              className="w-full rounded-full"
              onClick={() => setOnboarding(false)}
            >
              Done
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function EventActions({ event }: { event: ContentEvent }) {
  return (
    <>
      <p className="text-sm text-paper-muted">
        {event.artist} · {event.venue}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-paper">
        {event.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-paper transition hover:border-spark-teal hover:text-spark-teal"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Google Calendar
        </a>
        <button
          type="button"
          onClick={() => downloadIcs(event)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-paper transition hover:border-spark-teal hover:text-spark-teal"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download ICS
        </button>
        <Link
          href={`/event/${event.id}`}
          className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm font-medium text-spark-teal"
        >
          Event details
        </Link>
      </div>
    </>
  );
}
