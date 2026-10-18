"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useHydratedState } from "@/hooks/useHydrated";
import { assets, site } from "@/content/site";
import {
  LOGO_INTRO_KEY,
  readLogoIntroForce,
  readReduceMotion,
  shouldPlayLogoIntro,
} from "./logoIntroGate";

type Phase = "idle" | "play" | "out";

function readShouldPlay(): boolean {
  return shouldPlayLogoIntro({
    seen: sessionStorage.getItem(LOGO_INTRO_KEY) === "1",
    reduceMotion: readReduceMotion(),
    force: readLogoIntroForce(window.location.search),
  });
}

export function LogoIntro() {
  // Decided once after hydration; the effect below marks the session as seen.
  const [play] = useHydratedState("logo-intro", readShouldPlay, false);
  const [stage, setStage] = useState<Phase>("play");
  const phase: Phase = play ? stage : "idle";
  const leaveTimer = useRef<number | null>(null);
  const outTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!play) return;

    sessionStorage.setItem(LOGO_INTRO_KEY, "1");
    document.documentElement.classList.add("logo-intro-active");

    leaveTimer.current = window.setTimeout(() => setStage("out"), 3800);
    outTimer.current = window.setTimeout(() => finish(), 4600);

    return () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
      if (outTimer.current) window.clearTimeout(outTimer.current);
      document.documentElement.classList.remove("logo-intro-active");
    };
  }, [play]);

  function finish() {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    if (outTimer.current) window.clearTimeout(outTimer.current);
    document.documentElement.classList.remove("logo-intro-active");
    setStage("idle");
  }

  if (phase === "idle") return null;

  return (
    <div
      className={phase === "out" ? "logo-intro logo-intro--out" : "logo-intro"}
      role="dialog"
      aria-label={`${site.name} introduction`}
      aria-modal="true"
    >
      <div className="logo-intro__glow" aria-hidden />
      <div className="logo-intro__stage">
        <span className="logo-intro__ring logo-intro__ring--outer" aria-hidden />
        <span className="logo-intro__ring logo-intro__ring--inner" aria-hidden />
        <Image
          src={assets.logo3d}
          alt={site.mark}
          width={720}
          height={730}
          priority
          className="logo-intro__mark"
        />
      </div>
      <p className="logo-intro__kicker">{historySince()}</p>
      <p className="logo-intro__wordmark display">{site.mark}</p>
      <button type="button" className="logo-intro__skip" onClick={finish}>
        Enter the house
      </button>
    </div>
  );
}

function historySince(): string {
  return "Since 2014";
}
