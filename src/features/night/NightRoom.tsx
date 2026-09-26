"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import Link from "next/link";
import { copy, links, site } from "@/content/site";
import type { ContentEvent } from "@/lib/content";
import { downloadIcs, googleCalendarUrl } from "@/lib/schedule/calendar";
import { moderateKindnessBody } from "@/features/kindness/moderation";
import { DEFAULT_STUDIO, getStudio } from "@/features/app/storage";
import { useReducedMotion } from "@/hooks/useMedia";
import {
  addNightSpark,
  getLitRooms,
  getNightPass,
  getNightSparks,
  saveNightPass,
  toggleLitRoom,
  type NightPass,
  type NightSpark,
} from "@/features/night/pass";
import {
  clampTearPull,
  floorWalked,
  tearShouldOpen,
} from "@/features/night/play";
import {
  countdownParts,
  floorBeats,
  formatNightWhen,
  nightPhase,
  stampWord,
} from "@/features/night/program";
import { parseNightRsvp } from "@/features/night/rsvp";

type RsvpResponse = {
  ok?: boolean;
  delivered?: boolean;
  code?: string;
  error?: string;
};

export function NightRoom({ event }: { event: ContentEvent }) {
  const when = formatNightWhen(event);
  const beats = floorBeats(event);
  const reduce = useReducedMotion();
  const nameRef = useRef<HTMLInputElement>(null);
  const tearOrigin = useRef(0);
  const pullRef = useRef(0);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [pass, setPass] = useState<NightPass | null>(null);
  const [sparks, setSparks] = useState<NightSpark[]>([]);
  const [lit, setLit] = useState<string[]>([]);
  const [inking, setInking] = useState(false);
  const [inkHint, setInkHint] = useState(false);
  const [torn, setTorn] = useState(false);
  const [pull, setPull] = useState(0);
  const [landingId, setLandingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [party, setParty] = useState(1);
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [spark, setSpark] = useState("");
  const [sparkError, setSparkError] = useState("");
  const [copied, setCopied] = useState(false);

  const phase = nightPhase(event, now);
  const clock = phase === "upcoming" ? countdownParts(event.start, now) : null;

  useEffect(() => {
    const stored = getNightPass(event.id);
    setPass(stored);
    setSparks(getNightSparks(event.id));
    setLit(getLitRooms(event.id));
    if (!stored) {
      const studio = getStudio();
      if (studio.displayName !== DEFAULT_STUDIO.displayName) {
        setName(studio.displayName);
      }
    }
    setReady(true);
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [event.id]);

  async function sendSeat(input: {
    name: string;
    email: string;
    party: number;
    note?: string;
  }) {
    const response = await fetch("/api/night/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: event.id,
        name: input.name,
        email: input.email,
        party: input.party,
        note: input.note?.trim() ?? "",
        website,
      }),
    });
    const data = (await response.json()) as RsvpResponse;
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Could not hold that seat.");
    }
    return data;
  }

  function remember(next: NightPass) {
    saveNightPass(next);
    setPass(next);
    setInkHint(false);
    if (reduce) {
      setTorn(true);
      return;
    }
    setInking(true);
    window.setTimeout(() => {
      setInking(false);
      setTorn(true);
    }, 560);
  }

  function inkStamp() {
    if (!reduce) {
      setInking(false);
      window.requestAnimationFrame(() => setInking(true));
      window.setTimeout(() => setInking(false), 560);
    }
    if (!pass) {
      setInkHint(true);
      nameRef.current?.focus();
    }
  }

  function openStub() {
    setTorn(true);
    setPull(0);
  }

  function onTearDown(pointer: PointerEvent<HTMLButtonElement>) {
    if (reduce || torn) return;
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    tearOrigin.current = pointer.clientY;
  }

  function onTearMove(pointer: PointerEvent<HTMLButtonElement>) {
    if (!pointer.currentTarget.hasPointerCapture(pointer.pointerId)) return;
    const next = clampTearPull(pointer.clientY - tearOrigin.current);
    pullRef.current = next;
    setPull(next);
  }

  function onTearUp() {
    if (tearShouldOpen(pullRef.current)) openStub();
    pullRef.current = 0;
    setPull(0);
  }

  function lightRoom(roomId: string) {
    setLit(toggleLitRoom(event.id, roomId));
  }

  async function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    const parsed = parseNightRsvp({
      eventId: event.id,
      name,
      email,
      party,
      note,
      website,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setPending(true);
    try {
      const data = await sendSeat(parsed.data);
      if (!data.delivered || !data.code) {
        setError(data.error || copy.night.device);
        return;
      }
      remember({
        eventId: event.id,
        name: parsed.data.name,
        email: parsed.data.email,
        party: parsed.data.party,
        note: parsed.data.note?.trim() ?? "",
        code: data.code,
        delivered: true,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? copy.night.device
          : err instanceof Error
            ? err.message
            : "Could not hold that seat.",
      );
    } finally {
      setPending(false);
    }
  }

  async function sharePass() {
    if (!pass) return;
    const url = `${window.location.origin}/night`;
    const text = `${copy.night.shareLead} — ${event.title}. Pass ${pass.code}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function pinSpark(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const moderated = moderateKindnessBody(spark);
    if (!moderated.ok) {
      setSparkError(moderated.error ?? "Try a gentler line.");
      return;
    }
    const from = pass?.name || getStudio().displayName;
    const next = addNightSpark({
      id: `spark-${Date.now()}`,
      eventId: event.id,
      body: moderated.cleaned,
      from,
      createdAt: new Date().toISOString(),
    });
    setSparks(next);
    setLandingId(next[0]?.id ?? null);
    setSpark("");
    setSparkError("");
  }

  const walked = floorWalked(lit, beats);

  return (
    <div className="night-room">
      <div className="night-room__wash" aria-hidden />
      <div className="night-room__inner">
        <header className="night-room__intro">
          <p className="night-room__kicker">{copy.night.kicker}</p>
          <h1 className="display night-room__title">{event.title}</h1>
          <p className="night-room__lead">{copy.night.lineup}</p>
          {ready && clock ? (
            <p className="night-clock" aria-live="polite">
              <span>
                <strong>{clock.days}</strong> days
              </span>
              <span>
                <strong>{clock.hours}</strong> hrs
              </span>
              <span>
                <strong>{clock.minutes}</strong> min
              </span>
            </p>
          ) : null}
        </header>

        <article
          className={`night-ticket${torn ? " is-torn" : ""}${inking ? " is-inking" : ""}`}
          aria-label="Night pass"
        >
          <div className="night-ticket__perf" aria-hidden />
          <div className="night-ticket__face">
            <div className="night-ticket__when">
              <span className="night-ticket__dow">{when.weekday}</span>
              <span className="night-ticket__day display">{when.day}</span>
              <span className="night-ticket__mon">{when.month}</span>
            </div>
            <div className="night-ticket__rule" aria-hidden />
            <div className="night-ticket__meta">
              <p className="night-ticket__brand">{site.mark}</p>
              <h2 className="night-ticket__event display">{event.title}</h2>
              <p className="night-ticket__hours">
                {when.time} – {when.endTime}
              </p>
              <p className="night-ticket__venue">{event.venue}</p>
              {pass ? (
                <p className="night-ticket__guest">
                  {pass.name}
                  <span>
                    {pass.party === 1 ? "1 seat" : `${pass.party} seats`}
                  </span>
                </p>
              ) : (
                <p className="night-ticket__guest night-ticket__guest--open">
                  Your name lands here
                </p>
              )}
            </div>
            <button
              type="button"
              className={`night-stamp night-stamp--${phase}${inking || pass ? " is-inked" : ""}${inking ? " is-inking" : ""}`}
              onClick={inkStamp}
              aria-pressed={Boolean(pass) || inking}
            >
              {stampWord(phase)}
            </button>
          </div>

          <button
            type="button"
            className="night-tear"
            onClick={openStub}
            onPointerDown={onTearDown}
            onPointerMove={onTearMove}
            onPointerUp={onTearUp}
            onPointerCancel={onTearUp}
            aria-pressed={torn}
          >
            {torn ? copy.night.torn : copy.night.tear}
          </button>

          <div
            className="night-ticket__stub"
            style={pull > 0 ? { transform: `translateY(${pull}px)` } : undefined}
          >
            {pass ? (
              <>
                <p className="night-ticket__code display">{pass.code}</p>
                <p className="night-ticket__status">{copy.night.sent}</p>
                {pass.note ? <p className="night-ticket__note">{pass.note}</p> : null}
                {error ? (
                  <p className="night-ticket__error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="night-ticket__actions">
                  <a
                    className="house-cta house-cta--ghost night-ticket__ghost"
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Add to calendar
                  </a>
                  <button
                    type="button"
                    className="house-cta house-cta--ghost night-ticket__ghost"
                    onClick={() => downloadIcs(event)}
                  >
                    Save .ics
                  </button>
                  <a
                    className="house-cta house-cta--ghost night-ticket__ghost"
                    href={site.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                  <button
                    type="button"
                    className="house-cta house-cta--ghost night-ticket__ghost"
                    onClick={sharePass}
                  >
                    {copied ? "Link copied" : "Share the pass"}
                  </button>
                </div>
              </>
            ) : (
              <form className="night-form" onSubmit={onSubmit}>
                <div className="night-honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(input) => setWebsite(input.target.value)}
                    />
                  </label>
                </div>
                <label className="night-field">
                  <span>Name on the pass</span>
                  <input
                    ref={nameRef}
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(input) => setName(input.target.value)}
                    maxLength={80}
                  />
                </label>
                <label className="night-field">
                  <span>Email for Robbie</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(input) => setEmail(input.target.value)}
                    maxLength={120}
                  />
                </label>
                <fieldset className="night-party">
                  <legend>Seats</legend>
                  <div role="radiogroup" aria-label="How many seats" className="night-party__row">
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        role="radio"
                        aria-checked={party === count}
                        className={party === count ? "is-on" : undefined}
                        onClick={() => setParty(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="night-field">
                  <span>A note for the door (optional)</span>
                  <input
                    value={note}
                    onChange={(input) => setNote(input.target.value)}
                    maxLength={160}
                    placeholder="Coming from the station…"
                  />
                </label>
                {inkHint ? (
                  <p className="night-ticket__note" role="status">
                    {copy.night.stampReady}
                  </p>
                ) : null}
                {error ? (
                  <p className="night-ticket__error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="house-cta house-cta--primary"
                  disabled={!ready || pending || phase === "closed"}
                >
                  {phase === "closed"
                    ? "This night has closed"
                    : pending
                      ? "Holding…"
                      : copy.night.hold}
                </button>
              </form>
            )}
          </div>
        </article>

        <section className="night-floor" aria-labelledby="night-floor-title">
          <h2 id="night-floor-title" className="display">
            The floor
          </h2>
          <p>{walked ? copy.night.floorDone : copy.night.floorLead}</p>
          <p className="night-live" aria-live="polite">
            {walked
              ? copy.night.floorDone
              : `${lit.length} of ${beats.length} rooms lit`}
          </p>
          <ol className="night-bulbs" aria-hidden>
            {beats.map((beat) => (
              <li key={beat.id} className={lit.includes(beat.id) ? "is-lit" : undefined} />
            ))}
          </ol>
          <ol>
            {beats.map((beat) => {
              const on = lit.includes(beat.id);
              return (
                <li key={beat.id} className={on ? "is-lit" : undefined}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => lightRoom(beat.id)}
                  >
                    <span className="night-bulb" aria-hidden />
                    <p>{beat.kicker}</p>
                    <h3 className="display">{beat.title}</h3>
                    <p>{beat.body}</p>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="night-floor__links">
            <Link href="/kindness-always">Leave a kindness</Link>
            <a href={links.merch} target="_blank" rel="noreferrer">
              Kindness Always merch
            </a>
            <a href={`tel:${site.phoneTel}`}>Call {site.phone}</a>
            <Link href="/artist-schedule">Full schedule</Link>
          </div>
        </section>

        <section className="night-sparks" aria-labelledby="night-sparks-title">
          <h2 id="night-sparks-title" className="display">
            Pin a spark
          </h2>
          <p>{copy.night.sparksNote}</p>
          <ul>
            {sparks.length === 0 ? (
              <li className="night-sparks__empty">The plaster is still warm. Be the first line.</li>
            ) : (
              sparks.map((item) => (
                <li key={item.id} className={item.id === landingId ? "is-landing" : undefined}>
                  <p>{item.body}</p>
                  <span>{item.from}</span>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={pinSpark}>
            <label className="night-field">
              <span>A line for this night</span>
              <input
                value={spark}
                onChange={(input) => setSpark(input.target.value)}
                maxLength={240}
                placeholder="Shine bright."
              />
            </label>
            {sparkError ? (
              <p className="night-ticket__error" role="alert">
                {sparkError}
              </p>
            ) : null}
            <button type="submit" className="house-cta house-cta--ghost">
              {copy.night.toss}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
