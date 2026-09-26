"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  registerArtistAction,
  registerMemberAction,
} from "@/features/auth/actions";
import { useSession } from "@/features/auth/AuthProvider";
import { tapGenres } from "@/content/stage";
import { links } from "@/content/site";
import { Button, ButtonLink } from "@/shared/ui/Button";

type Door = "pick" | "member" | "artist" | "memberDone" | "artistDone";

const MEDIUMS = tapGenres.map((g) => g.label);

export function JoinExperience({
  initialDoor,
}: {
  initialDoor?: "member" | "artist" | null;
}) {
  const router = useRouter();
  const { user } = useSession();
  const reduce = useReducedMotion();
  const [door, setDoor] = useState<Door>(
    initialDoor === "member" || initialDoor === "artist" ? initialDoor : "pick",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const [artistStep, setArtistStep] = useState(0);
  const [artistName, setArtistName] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [medium, setMedium] = useState<string>(MEDIUMS[0] ?? "Musicians");
  const [intent, setIntent] = useState("");

  useEffect(() => {
    if (initialDoor === "member" || initialDoor === "artist") {
      setDoor(initialDoor);
    }
  }, [initialDoor]);

  function openMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerMemberAction({
        name: memberName,
        email: memberEmail,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoor("memberDone");
      router.refresh();
    });
  }

  function openArtist(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerArtistAction({
        name: artistName,
        email: artistEmail,
        handle,
        medium,
        intent,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoor("artistDone");
      router.refresh();
    });
  }

  if (user && door === "pick") {
    return (
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-ink-elevated px-5 py-10 sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in srgb, var(--spark-teal) 35%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 100%, color-mix(in srgb, var(--spark-coral) 28%, transparent), transparent 50%)",
          }}
        />
        <div className="relative max-w-lg">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-gold">
            Already in the house
          </p>
          <h1 className="display mt-3 text-4xl text-paper-on-dark sm:text-5xl">
            Welcome back, {user.name}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-paper-on-dark/75">
            {user.role === "ARTIST"
              ? "Your studio session is open. Create stays locked until Robbie approves your profile."
              : "Your member pass is active. Respond on the Wall, or support through PayPal and Bonfire."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/explore" className="rounded-full">
              Open the Wall
            </ButtonLink>
            {user.role === "ARTIST" ? (
              <ButtonLink
                href="/install"
                variant="outline"
                className="rounded-full"
              >
                Install the studio
              </ButtonLink>
            ) : (
              <ButtonLink
                href={links.donate}
                external
                variant="outline"
                className="rounded-full"
              >
                Support on PayPal
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-ink-elevated">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 10% -10%, color-mix(in srgb, var(--spark-coral) 32%, transparent), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 110%, color-mix(in srgb, var(--spark-teal) 30%, transparent), transparent 55%), linear-gradient(165deg, var(--ink) 0%, var(--ink-elevated) 55%, #041018 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(-12deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
        }}
      />

      <div className="relative px-5 py-10 sm:px-10 sm:py-14">
        {door === "pick" ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-spark-coral">
              Two doors · one house
            </p>
            <h1 className="display mt-4 text-4xl text-paper-on-dark sm:text-6xl">
              The Artist Post
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-paper-on-dark/80">
              Step in as a member of the night, or open the studio as an artist.
              No invented roster — only real names.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <DoorCard
                tone="teal"
                kicker="Member"
                title="Enter the night"
                body="Respond to posts, leave kindness on the Wall, and support through PayPal or Bonfire."
                cta="Member door"
                onClick={() => {
                  setError(null);
                  setDoor("member");
                }}
              />
              <DoorCard
                tone="coral"
                kicker="Artist"
                title="Open the studio"
                body="Name, handle, medium, intent — then install the app. Publish stays closed until approved."
                cta="Artist door"
                onClick={() => {
                  setError(null);
                  setArtistStep(0);
                  setDoor("artist");
                }}
              />
            </div>
          </motion.div>
        ) : null}

        {door === "member" ? (
          <motion.form
            onSubmit={openMember}
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="mx-auto max-w-md"
          >
            <button
              type="button"
              onClick={() => setDoor("pick")}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-spark-teal"
            >
              ← Both doors
            </button>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-teal">
              Member door
            </p>
            <h2 className="display mt-2 text-3xl text-paper-on-dark sm:text-4xl">
              Take a seat in the house
            </h2>
            <p className="mt-2 text-sm text-paper-on-dark/75">
              Name and email open a member pass. No password this round — email
              is your key.
            </p>
            <label className="mt-6 block">
              <span className="text-xs font-semibold text-paper-on-dark/60">
                Your name
              </span>
              <input
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="mt-2 min-h-12 w-full rounded-full border border-line bg-ink/50 px-5 text-sm text-paper-on-dark outline-none focus:border-spark-teal"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-paper-on-dark/60">
                Email
              </span>
              <input
                required
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                maxLength={200}
                autoComplete="email"
                className="mt-2 min-h-12 w-full rounded-full border border-line bg-ink/50 px-5 text-sm text-paper-on-dark outline-none focus:border-spark-teal"
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm text-spark-coral" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-full !bg-spark-teal !text-[#020b1a]"
            >
              {pending ? "Opening…" : "Enter as member"}
            </Button>
          </motion.form>
        ) : null}

        {door === "artist" ? (
          <motion.form
            onSubmit={(e) => {
              if (artistStep < 2) {
                e.preventDefault();
                setError(null);
                if (artistStep === 0 && (!artistName.trim() || !artistEmail.trim())) {
                  setError("Name and email open the first lock.");
                  return;
                }
                if (artistStep === 1 && !handle.trim()) {
                  setError("Pick a handle for the studio.");
                  return;
                }
                setArtistStep((s) => s + 1);
                return;
              }
              openArtist(e);
            }}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="mx-auto max-w-md"
          >
            <button
              type="button"
              onClick={() => {
                if (artistStep > 0) {
                  setArtistStep((s) => s - 1);
                  setError(null);
                  return;
                }
                setDoor("pick");
              }}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-spark-coral"
            >
              ← {artistStep > 0 ? "Back a step" : "Both doors"}
            </button>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
              Artist door · step {artistStep + 1} of 3
            </p>
            <h2 className="display mt-2 text-3xl text-paper-on-dark sm:text-4xl">
              {artistStep === 0 && "Who walks in"}
              {artistStep === 1 && "Your studio handle"}
              {artistStep === 2 && "What you make"}
            </h2>
            <p className="mt-2 text-sm text-paper-on-dark/75">
              {artistStep === 0 &&
                "This is the studio app path — not a generic web form."}
              {artistStep === 1 &&
                "Letters, numbers, _ or -. This is how the house finds you."}
              {artistStep === 2 &&
                "Pending approval after you finish. Create stays closed until Robbie says yes."}
            </p>

            {artistStep === 0 ? (
              <>
                <label className="mt-6 block">
                  <span className="text-xs font-semibold text-paper-on-dark/60">
                    Name
                  </span>
                  <input
                    required
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                    className="mt-2 min-h-12 w-full rounded-full border border-line bg-ink/50 px-5 text-sm text-paper-on-dark outline-none focus:border-spark-coral"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="text-xs font-semibold text-paper-on-dark/60">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    value={artistEmail}
                    onChange={(e) => setArtistEmail(e.target.value)}
                    maxLength={200}
                    autoComplete="email"
                    className="mt-2 min-h-12 w-full rounded-full border border-line bg-ink/50 px-5 text-sm text-paper-on-dark outline-none focus:border-spark-coral"
                  />
                </label>
              </>
            ) : null}

            {artistStep === 1 ? (
              <label className="mt-6 block">
                <span className="text-xs font-semibold text-paper-on-dark/60">
                  Handle
                </span>
                <div className="mt-2 flex items-center gap-2 rounded-full border border-line bg-ink/50 px-5">
                  <span className="text-sm text-paper-on-dark/50">@</span>
                  <input
                    required
                    value={handle}
                    onChange={(e) =>
                      setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                    }
                    maxLength={40}
                    autoComplete="username"
                    className="min-h-12 w-full bg-transparent text-sm text-paper-on-dark outline-none"
                  />
                </div>
              </label>
            ) : null}

            {artistStep === 2 ? (
              <>
                <label className="mt-6 block">
                  <span className="text-xs font-semibold text-paper-on-dark/60">
                    Medium
                  </span>
                  <select
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-full border border-line bg-ink/50 px-5 text-sm text-paper-on-dark outline-none focus:border-spark-coral"
                  >
                    {MEDIUMS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block">
                  <span className="text-xs font-semibold text-paper-on-dark/60">
                    Short intent
                  </span>
                  <textarea
                    required
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    maxLength={280}
                    rows={3}
                    placeholder="What do you want to hang in this house?"
                    className="mt-2 w-full rounded-2xl border border-line bg-ink/50 px-4 py-3 text-sm text-paper-on-dark outline-none focus:border-spark-coral"
                  />
                </label>
              </>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-spark-coral" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-full !bg-spark-coral !text-[#020b1a]"
            >
              {pending
                ? "Unlocking…"
                : artistStep < 2
                  ? "Next lock"
                  : "Open my studio"}
            </Button>
          </motion.form>
        ) : null}

        {door === "memberDone" ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-md text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-teal">
              Member pass active
            </p>
            <h2 className="display mt-3 text-4xl text-paper-on-dark">
              You&apos;re in the house
            </h2>
            <p className="mt-3 text-sm text-paper-on-dark/75">
              When an approved post is on the Wall, you can leave a real comment.
              If the catalog is quiet, the empty frames are honest — hang around
              or support the mission.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <ButtonLink href="/explore" className="rounded-full">
                Open the Wall
              </ButtonLink>
              <ButtonLink
                href={links.donate}
                external
                variant="outline"
                className="rounded-full"
              >
                Donate via PayPal
              </ButtonLink>
              <ButtonLink
                href={links.merch}
                external
                variant="ghost"
                className="rounded-full"
              >
                Bonfire merch
              </ButtonLink>
            </div>
          </motion.div>
        ) : null}

        {door === "artistDone" ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-lg text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
              Studio pending
            </p>
            <h2 className="display mt-3 text-4xl text-paper-on-dark sm:text-5xl">
              Keys are cut. Door stays latched.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-paper-on-dark/80">
              Your artist profile is pending approval — not published yet. Install
              The Artist Post as an app so Create feels like the studio, not a
              browser tab. Publishing unlocks only after Robbie approves you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <ButtonLink
                href="/install"
                className="rounded-full !bg-spark-coral !text-[#020b1a]"
              >
                Install / open as app
              </ButtonLink>
              <ButtonLink href="/create" variant="outline" className="rounded-full">
                Peek at Create
              </ButtonLink>
              <ButtonLink href="/more" variant="ghost" className="rounded-full">
                Studio hub
              </ButtonLink>
            </div>
            <p className="mt-6 text-xs text-paper-on-dark/55">
              Signed in as @{handle}. Sign out anytime in{" "}
              <Link href="/settings" className="text-spark-teal underline-offset-2 hover:underline">
                Settings
              </Link>
              .
            </p>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

function DoorCard({
  tone,
  kicker,
  title,
  body,
  cta,
  onClick,
}: {
  tone: "teal" | "coral";
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  const rim = tone === "teal" ? "var(--spark-teal)" : "var(--spark-coral)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-line bg-ink/45 p-6 text-left transition hover:border-[color-mix(in_srgb,var(--spark-gold)_50%,transparent)] active:scale-[0.99]"
      style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${rim} 25%, transparent)` }}
    >
      <span
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-50"
        style={{ background: rim }}
        aria-hidden
      />
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: rim }}
      >
        {kicker}
      </p>
      <p className="display mt-3 text-2xl text-paper-on-dark">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-paper-on-dark/70">{body}</p>
      <span
        className="mt-5 inline-flex text-sm font-semibold"
        style={{ color: rim }}
      >
        {cta} →
      </span>
    </button>
  );
}
