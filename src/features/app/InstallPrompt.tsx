"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { site } from "@/content/site";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/shared/ui/Button";
import {
  dismissInstall,
  getInstallDismissedAt,
} from "@/features/app/storage";
import { useIosDevice, useStandalone } from "@/features/app/useDisplayMode";

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const standalone = useStandalone();
  const ios = useIosDevice();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (standalone) return;
    const dismissed = getInstallDismissedAt();
    if (dismissed && Date.now() - dismissed < FOURTEEN_DAYS) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const timer = window.setTimeout(() => {
      if (ios) setOpen(true);
    }, 1800);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(timer);
    };
  }, [ios, standalone]);

  if (standalone || !open) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      trackEvent("app_install", { source: "prompt" });
    }
    dismissInstall();
    setOpen(false);
  }

  function hide() {
    dismissInstall();
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[45] md:inset-x-auto md:right-4 md:bottom-4 md:w-[380px]">
      <div className="rounded-2xl border border-line bg-ink-elevated/95 p-4 shadow-glow backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-spark-gold">
              Install {site.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-paper">
              Keep the gallery on your home screen.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-paper-muted">
              {ios
                ? "On iPhone, tap Share, then Add to Home Screen. It opens like an app — full screen, no browser chrome."
                : "Install the web app for a full-screen studio with offline Home, Explore, and Kindness."}
            </p>
          </div>
          <button
            type="button"
            onClick={hide}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-paper-muted hover:text-paper"
            aria-label="Dismiss install"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {deferred ? (
            <Button
              size="sm"
              className="rounded-full !bg-spark-teal !text-[#020b1a]"
              onClick={install}
            >
              <Download className="h-4 w-4" aria-hidden />
              Install
            </Button>
          ) : ios ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-spark-teal">
              <Share className="h-3.5 w-3.5" aria-hidden />
              Share → Add to Home Screen
            </p>
          ) : null}
          <Button size="sm" variant="ghost" className="rounded-full" onClick={hide}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
