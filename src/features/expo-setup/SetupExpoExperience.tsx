"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Apple,
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
      return "Tunnel configured";
    case "fallback":
      return "Using last-known tunnel";
    case "offline":
      return "Tunnel offline";
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
              "Could not load the Expo Go tunnel. Try again in a moment.",
          });
          return;
        }
        setState({ kind: "ready", data: body.data });
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Network error loading Expo Go setup.",
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
    // Prefer same-tab navigation so iOS/Android hand off to Expo Go.
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
            Open the native Artist Post tip on your phone over the internet —
            Expo Go + the live Metro tunnel. No Apple Developer account.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {state.kind === "loading" ? (
              <Button
                size="lg"
                className="rounded-full !bg-spark-teal !text-ink"
                disabled
              >
                Loading tunnel…
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
                Open in Expo Go
              </Button>
            ) : null}

            {data && !canOpen ? (
              <p className="inline-flex items-center gap-2 text-sm text-spark-coral">
                <TriangleAlert className="h-4 w-4" aria-hidden />
                Tunnel URL not available right now
              </p>
            ) : null}

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

          {data ? (
            <p className="mt-4 text-xs text-paper-on-dark/65">
              {statusLabel(data.status)}
              {data.updatedAt
                ? ` · updated ${new Date(data.updatedAt).toLocaleString()}`
                : null}
              {" · "}
              needs Expo Go for SDK {data.sdkMajor}
            </p>
          ) : null}
        </div>
      </section>

      <PageShell className="space-y-16">
        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            Phone
          </p>
          <h2 className="display mt-3 text-3xl text-paper sm:text-4xl">
            iPhone or Android
          </h2>
          <ol className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-paper-muted sm:text-base">
            <li>
              <span className="font-semibold text-paper">1. Install Expo Go</span>{" "}
              — latest from the{" "}
              {data ? (
                <>
                  <a
                    href={data.stores.ios}
                    className="text-spark-teal hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    App Store
                  </a>
                  {" / "}
                  <a
                    href={data.stores.android}
                    className="text-spark-teal hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Play Store
                  </a>
                </>
              ) : (
                "App Store or Play Store"
              )}
              . It must support SDK {data?.sdkMajor ?? 57}.
            </li>
            <li>
              <span className="font-semibold text-paper">
                2. Force-quit Expo Go
              </span>{" "}
              — swipe it away from the app switcher so it fully restarts.
            </li>
            <li>
              <span className="font-semibold text-paper">
                3. Sign out of Expo Go
              </span>{" "}
              — open Expo Go → Profile / Settings → Sign out. Required while
              this tip uses an anonymous Metro tunnel (no Expo account on the
              CLI). Staying signed in as robbiealvarez against an anonymous
              session triggers the “accounts need to match” error.
            </li>
            <li>
              <span className="font-semibold text-paper">
                4. Hard-refresh this page
              </span>{" "}
              — pull to refresh (or close the Safari tab and reopen{" "}
              <span className="text-paper">/setup-expo</span>) so you get the
              current tunnel URL.
            </li>
            <li>
              <span className="font-semibold text-paper">
                5. Tap Open in Expo Go
              </span>{" "}
              above — or scan the QR on a desktop browser of this page. Cellular
              or any Wi‑Fi works; the tunnel is on the public internet. After it
              loads you can sign back into robbiealvarez in Expo Go for other
              projects.
            </li>
          </ol>

          {expoGoUrl ? (
            <p className="mt-6 max-w-2xl break-all font-mono text-xs text-paper-muted">
              {expoGoUrl}
            </p>
          ) : null}

          {data?.notes ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted">
              {data.notes}
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
                alt="QR code that opens the Expo Go tunnel"
                className="mt-4 bg-paper p-3"
              />
            </div>
          ) : null}
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
            Mac
          </p>
          <h2 className="display mt-3 text-3xl text-paper sm:text-4xl">
            Simulator / Xcode
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            Best long-term path: on your Mac, signed into Expo as{" "}
            <span className="text-paper">robbiealvarez</span>, clone the app
            repo and run{" "}
            <code className="text-paper">npx expo start --tunnel --go</code>.
            Keep Expo Go signed in as robbiealvarez — accounts match. The
            cloud anonymous tunnel is for phone-only tips without a Mac.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            On a Mac you can also run the native shell in the iOS Simulator
            without a paid Apple Developer account — free Xcode, then either an
            EAS simulator build or a local clone.
          </p>
          <ul className="mt-6 max-w-2xl space-y-3 text-sm leading-relaxed text-paper-muted sm:text-base">
            <li className="flex gap-3">
              <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-spark-teal" aria-hidden />
              <span>
                Install Xcode from the Mac App Store, open Simulator, then
                install the latest{" "}
                <span className="text-paper">development-simulator</span> build
                from the Expo project dashboard (or{" "}
                <code className="text-paper">npx expo run:ios</code> after
                cloning).
              </span>
            </li>
            <li className="flex gap-3">
              <Apple className="mt-0.5 h-5 w-5 shrink-0 text-spark-teal" aria-hidden />
              <span>
                Point Simulator at the same Metro tunnel Flux keeps warm (
                <code className="text-paper">npm run start:go</code> in the app
                repo). Physical-device IPA still needs an Apple team — not
                required for Expo Go on a real phone.
              </span>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {data ? (
              <ButtonLink
                href={data.project.dashboardUrl}
                external
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Expo project
              </ButtonLink>
            ) : null}
            <ButtonLink
              href="/install"
              size="sm"
              variant="ghost"
              className="rounded-full"
            >
              Web / PWA install instead
            </ButtonLink>
          </div>
        </SectionReveal>

        <SectionReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
            Honest limits
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-muted sm:text-base">
            This tip’s Metro runs <span className="text-paper">anonymous</span>{" "}
            (no robot / org CLI login). Expo Go and the CLI must match — so{" "}
            <span className="text-paper">sign out of Expo Go</span> before
            opening the link. Do not sign into a robot account. This page only
            works while Flux has Metro with{" "}
            <code className="text-paper">--tunnel --go</code>. If Open in Expo
            Go fails, the tunnel host may have rotated — ask Flux to refresh{" "}
            <code className="text-paper">EXPO_DEV_TUNNEL_URL</code> on the VPS.
            Prefer the home-screen web app anytime:{" "}
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
