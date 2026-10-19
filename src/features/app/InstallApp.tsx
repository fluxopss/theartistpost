"use client";

import { Download, Share, Smartphone } from "lucide-react";
import { appCopy, site } from "@/content/site";
import { Button } from "@/shared/ui/Button";
import { useIosDevice, useStandalone } from "@/features/app/useDisplayMode";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const standalone = useStandalone();
  const ios = useIosDevice();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      trackEvent("app_install", { source: "install_page" });
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
          {site.name}
        </p>
        <h1 className="display mt-3 text-4xl text-paper sm:text-5xl">
          {appCopy.installTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-paper-muted">
          {appCopy.installLead}
        </p>
      </header>

      {standalone ? (
        <p className="rounded-2xl border border-spark-teal/40 bg-accent-soft px-4 py-3 text-sm text-spark-teal">
          This device is already running the installed app.
        </p>
      ) : (
        <section className="rounded-3xl border border-line bg-ink-elevated p-5">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 text-spark-teal" aria-hidden />
            <div>
              <h2 className="font-semibold text-paper">Add to your home screen</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-muted">
                {ios
                  ? "On iPhone or iPad: tap Share, then Add to Home Screen. It opens full screen — no Safari chrome."
                  : "On Android, tap Install when prompted. On desktop Chrome, use the install icon in the address bar."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
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
                  <p className="inline-flex items-center gap-1.5 text-sm text-spark-teal">
                    <Share className="h-4 w-4" aria-hidden />
                    Share → Add to Home Screen
                  </p>
                ) : (
                  <p className="text-sm text-paper-muted">
                    If your browser supports it, an install prompt will appear
                    here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="display text-2xl text-paper">What you get</h2>
        <ul className="mt-4 space-y-3">
          {appCopy.installBenefits.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-line px-4 py-3"
            >
              <p className="font-semibold text-paper">{item.title}</p>
              <p className="mt-1 text-sm text-paper-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
