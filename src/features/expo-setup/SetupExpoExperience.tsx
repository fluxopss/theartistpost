"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Laptop,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { assets, site } from "@/content/site";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { SectionReveal } from "@/components/SectionReveal";
import type { ExpoDevPayload, ExpoDevStatus } from "@/features/expo-setup/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ExpoDevPayload };

function statusLabel(status: ExpoDevStatus): string {
  switch (status) {
    case "ready":
      return "Remote tip available";
    case "fallback":
      return "Using last-known tip link";
    case "offline":
      return "Remote tip offline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function qrImageUrl(expoGoUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&ecc=M&data=${encodeURIComponent(expoGoUrl)}`;
}

export function SetupExpoExperience() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/v1/app/expo-dev", {
          cache: "no-store",
        });
        const body = (await response.json()) as {
          ok: boolean;
          data?: ExpoDevPayload;
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.data) {
          setState({
            kind: "error",
            message:
              body.error?.message ??
              "Could not load the optional phone tip link. The Mac steps below still work.",
          });
          return;
        }
        setState({ kind: "ready", data: body.data });
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              "Could not load the optional phone tip link. The Mac steps below still work.",
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openExpoGo = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  const data = state.kind === "ready" ? state.data : null;
  const expoGoUrl = data?.expoGoUrl ?? null;
  const canOpen = Boolean(expoGoUrl);

  return (
    <>
      <section className="relative isolate min-h-[48vh] overflow-hidden">
        <Image
          src={assets.haciendaHero}
          alt=""
          fill
          className="object-cover object-center opacity-35"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-ink/75 to-ink/45" />
        <div className="relative mx-auto flex max-w-[var(--content-max)] flex-col justify-end px-4 pb-14 pt-28 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {site.mark}
          </p>
          <h1 className="display mt-3 max-w-3xl text-4xl text-paper-on-dark sm:text-5xl md:text-6xl">
            Setup latest Expo Go
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-paper-on-dark/80 sm:text-lg">
            Best path: run the app on your Mac, stay signed into Expo Go as{" "}
            <span className="text-paper-on-dark">robbiealvarez</span>, and open
            it on your iPhone. No Apple Developer account needed.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ButtonLink
              href="#mac-steps"
              size="lg"
              className="rounded-full !bg-spark-teal !text-ink"
            >
              <Laptop className="h-5 w-5" aria-hidden />
              Run on your Mac (recommended)
            </ButtonLink>
            {data ? (
              <ButtonLink
                href={data.stores.ios}
                external
                size="lg"
                variant="onDark"
                className="rounded-full"
              >
                Get Expo Go (iPhone)
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </section>

      <PageShell className="space-y-16">
        <SectionReveal>
          <div id="mac-steps" className="scroll-mt-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
              Recommended
            </p>
            <h2 className="display mt-3 text-3xl text-paper sm:text-4xl">
              Run on your Mac
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
              You need a Mac, internet, Expo Go from the App Store, and your
              Expo login for <span className="text-paper">robbiealvarez</span>.
            </p>
            <ol className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-paper-muted sm:text-base">
              <li>
                <span className="font-semibold text-paper">
                  1. Install Node.js (LTS)
                </span>{" "}
                from{" "}
                <a
                  href="https://nodejs.org"
                  className="text-spark-teal hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  nodejs.org
                </a>{" "}
                if you do not already have it. Restart Terminal after install.
              </li>
              <li>
                <span className="font-semibold text-paper">
                  2. Get the code
                </span>{" "}
                — open Terminal and paste:
                <pre className="mt-2 overflow-x-auto rounded-sm bg-ink/40 p-3 font-mono text-xs text-paper">
                  {`git clone https://github.com/fluxopss/theartistpost-app.git
cd theartistpost-app
npm install`}
                </pre>
              </li>
              <li>
                <span className="font-semibold text-paper">
                  3. Log into Expo
                </span>{" "}
                as robbiealvarez:
                <pre className="mt-2 overflow-x-auto rounded-sm bg-ink/40 p-3 font-mono text-xs text-paper">
                  npx expo login
                </pre>
              </li>
              <li>
                <span className="font-semibold text-paper">4. Start</span>
                <pre className="mt-2 overflow-x-auto rounded-sm bg-ink/40 p-3 font-mono text-xs text-paper">
                  npx expo start --tunnel --go
                </pre>
                Leave Terminal open. A QR code will appear.
              </li>
              <li>
                <span className="font-semibold text-paper">
                  5. Open on your iPhone
                </span>{" "}
                — Expo Go must still be signed in as{" "}
                <span className="text-paper">robbiealvarez</span>. Scan the QR
                (or open the project when Expo Go offers it).
              </li>
            </ol>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
              <span className="font-semibold text-paper">Later updates:</span>{" "}
              in the project folder run{" "}
              <code className="text-paper">git pull</code>, then{" "}
              <code className="text-paper">npm install</code>, then{" "}
              <code className="text-paper">npx expo start --tunnel --go</code>{" "}
              again.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href="https://github.com/fluxopss/theartistpost-app"
                external
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                App repo on GitHub
              </ButtonLink>
              <ButtonLink
                href="/install"
                size="sm"
                variant="ghost"
                className="rounded-full"
              >
                Web / home-screen install instead
              </ButtonLink>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            Only if needed
          </p>
          <h2 className="display mt-3 text-3xl text-paper sm:text-4xl">
            Phone tip (no Mac today)
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            Prefer the Mac steps above. Use this only when you cannot run the
            app from your Mac.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {state.kind === "loading" ? (
              <Button
                size="lg"
                className="rounded-full !bg-spark-teal !text-ink"
                disabled
              >
                Loading tip link…
              </Button>
            ) : null}

            {state.kind === "error" ? (
              <p className="max-w-md text-sm text-spark-coral">
                {state.message}
              </p>
            ) : null}

            {canOpen && expoGoUrl ? (
              <Button
                size="lg"
                className="rounded-full !bg-spark-teal !text-ink"
                onClick={() => openExpoGo(expoGoUrl)}
              >
                <Smartphone className="h-5 w-5" aria-hidden />
                Open tip in Expo Go
              </Button>
            ) : null}

            {data && !canOpen ? (
              <p className="inline-flex items-center gap-2 text-sm text-spark-coral">
                <TriangleAlert className="h-4 w-4" aria-hidden />
                Tip link not available right now — use the Mac steps
              </p>
            ) : null}
          </div>

          {data ? (
            <p className="mt-4 text-xs text-paper-muted">
              {statusLabel(data.status)}
              {data.updatedAt
                ? ` · updated ${new Date(data.updatedAt).toLocaleString()}`
                : null}
              {" · "}
              needs Expo Go for SDK {data.sdkMajor}
            </p>
          ) : null}

          {expoGoUrl ? (
            <div className="mt-10 hidden max-w-sm md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
                Desktop — scan into Expo Go
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- remote QR for ops tip */}
              <img
                src={qrImageUrl(expoGoUrl)}
                width={240}
                height={240}
                alt="QR code that opens the Expo Go tip"
                className="mt-4 bg-paper p-3"
              />
            </div>
          ) : null}
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
            Honest limits
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            The Mac path is the everyday way to try the native app. The phone
            tip link only works while someone has left a matching Expo session
            running. Prefer the home-screen web app anytime:{" "}
            <Link href="/install" className="text-spark-teal hover:underline">
              Get the app (PWA)
            </Link>
            .
          </p>
        </SectionReveal>
      </PageShell>
    </>
  );
}
