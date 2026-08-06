"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spark-coral">
        Something went wrong
      </p>
      <h1 className="display mt-3 text-2xl text-paper">Couldn’t load this screen</h1>
      <p className="mt-2 max-w-xs text-sm text-paper-muted">
        {error.message || "Please try again."}
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper-on-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-paper"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
