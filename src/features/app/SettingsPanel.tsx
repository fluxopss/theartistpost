"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/design-system/primitives/Toast";
import { useSession } from "@/features/auth/AuthProvider";
import {
  applyMotionPreference,
  clearLocalAppData,
  getMotionPreference,
  getStudio,
  setMotionPreference,
  setStudio,
  type MotionPreference,
} from "@/features/app/storage";

export function SettingsPanel() {
  const { theme, setTheme, mounted } = useTheme();
  const { push } = useToast();
  const { user, isAuthenticated, signOut, signingOut } = useSession();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [motion, setMotion] = useState<MotionPreference>("system");

  useEffect(() => {
    const studio = getStudio();
    setName(studio.displayName);
    setCity(studio.city ?? "");
    setMotion(getMotionPreference());
    applyMotionPreference();
  }, []);

  function saveStudio(e: React.FormEvent) {
    e.preventDefault();
    const next = setStudio({ displayName: name, city });
    setName(next.displayName);
    push({
      title: "Studio saved",
      description: "This name stays on this device.",
      tone: "success",
    });
  }

  function onMotion(next: MotionPreference) {
    setMotion(next);
    setMotionPreference(next);
  }

  function reset() {
    clearLocalAppData();
    setName("Studio Guest");
    setCity("");
    setMotion("system");
    push({
      title: "Local studio cleared",
      description: "Likes, saves, notes, and this name were removed.",
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="display text-2xl text-paper">Session</h2>
        {isAuthenticated && user ? (
          <>
            <p className="text-sm text-paper-muted">
              Signed in as <span className="text-paper">{user.name}</span>
              {user.handle ? ` (@${user.handle})` : ""} · {user.role.toLowerCase()}
              {user.role === "ARTIST"
                ? " · Create stays closed until approved"
                : ""}
            </p>
            <p className="text-xs text-paper-muted">{user.email}</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={signingOut}
              onClick={() => signOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-paper-muted">
              No account session on this device. Browse freely, or join to leave
              real comments and open a pending studio.
            </p>
            <Button
              type="button"
              className="rounded-full !bg-spark-teal !text-[#020b1a]"
              onClick={() => {
                window.location.href = "/join";
              }}
            >
              Open the join doors
            </Button>
          </>
        )}
      </section>

      <form onSubmit={saveStudio} className="space-y-4">
        <h2 className="display text-2xl text-paper">On-device name</h2>
        <p className="text-sm text-paper-muted">
          Used for local kindness notes and device-only comments when you are
          signed out. Your account name above is separate.
        </p>
        <label className="block">
          <span className="text-xs font-semibold text-paper-muted">
            Display name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="mt-2 min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm text-paper outline-none focus:border-spark-teal"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-paper-muted">
            City (optional)
          </span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            placeholder="West Palm Beach"
            className="mt-2 min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm text-paper outline-none focus:border-spark-teal"
          />
        </label>
        <Button type="submit" className="rounded-full !bg-spark-teal !text-[#020b1a]">
          Save on-device name
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="display text-2xl text-paper">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold capitalize ${
                mounted && theme === mode
                  ? "border-spark-teal bg-accent-soft text-spark-teal"
                  : "border-line text-paper"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-sm text-paper-muted">
          Motion follows your system unless you ask the house to stay still.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["system", "System motion"],
              ["reduce", "Reduce motion"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onMotion(value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                motion === value
                  ? "border-spark-gold bg-spark-gold/10 text-spark-gold"
                  : "border-line text-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="display text-2xl text-paper">This device</h2>
        <p className="text-sm text-paper-muted">
          Kindness notes, local likes, device comments, and saved nights live in
          local storage. Clearing them cannot be undone. Sign-out is separate.
        </p>
        <Button type="button" variant="outline" className="rounded-full" onClick={reset}>
          Clear local studio
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="display text-2xl text-paper">Account deletion</h2>
        <p className="text-sm text-paper-muted">
          To remove a member or pending artist account and its data, email{" "}
          <a
            href="mailto:Robbie@theartistpost.org?subject=Delete%20my%20Artist%20Post%20account"
            className="text-spark-teal underline-offset-2 hover:underline"
          >
            Robbie@theartistpost.org
          </a>
          . In-app deletion lands with the next auth pass.{" "}
          <Link href="/join" className="text-spark-teal underline-offset-2 hover:underline">
            Join doors
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
