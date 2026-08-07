import Link from "next/link";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export default function NotFound() {
  return (
    <PageShell className="text-center !pt-24">
      <h1 className="display text-4xl text-paper">Lost in the gallery</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-paper-muted">
        That scene isn&apos;t on the wall yet.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/explore" className="rounded-full">
          Explore The Wall
        </ButtonLink>
        <ButtonLink href="/" variant="outline" className="rounded-full">
          Home
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-paper-muted">
        Or{" "}
        <Link
          href="/create"
          className="font-semibold text-spark-teal underline"
        >
          create something new
        </Link>
        .
      </p>
    </PageShell>
  );
}
