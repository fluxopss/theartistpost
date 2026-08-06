import Link from "next/link";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";

export default function NotFound() {
  return (
    <PageShell className="text-center">
      <h1 className="display text-4xl text-ink">Lost in the gallery</h1>
      <p className="mx-auto mt-3 max-w-xs text-sm text-paper-muted">
        That scene isn&apos;t on the wall yet.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink href="/explore" className="w-full">
          Explore Posts
        </ButtonLink>
        <ButtonLink href="/" variant="outline" className="w-full">
          Home
        </ButtonLink>
      </div>
      <p className="mt-6 text-sm text-paper-muted">
        Or{" "}
        <Link href="/create" className="font-semibold text-ink underline">
          create something new
        </Link>
        .
      </p>
    </PageShell>
  );
}
