"use client";

import { FormEvent, useState } from "react";
import { copy, site } from "@/content/site";
import { Button, ButtonLink } from "@/shared/ui/Button";

export function ContactSocialSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function onSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus("Enter an email address.");
      return;
    }
    setStatus("Thanks — newsletter signup will connect soon.");
    setEmail("");
  }

  return (
    <section className="px-4 py-6">
      <div className="rounded-2xl border border-line bg-surface-muted p-4">
        <h2 className="display text-xl text-ink">{copy.home.contactTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-ink">
          {copy.home.contactLead}
        </p>
        <p className="mt-2 text-sm text-paper-muted">{copy.home.contactBody}</p>
        <p className="mt-3 text-xs text-paper-muted">{site.address.full}</p>
        <p className="mt-1 text-xs text-paper-muted">
          Open today {site.hoursToday}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <ButtonLink href={`mailto:${site.email}`} className="w-full">
            {copy.home.dropLine}
          </ButtonLink>
          <ButtonLink
            href={site.mapsUrl}
            external
            variant="outline"
            className="w-full"
          >
            {copy.home.getDirections}
          </ButtonLink>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line p-4">
        <h3 className="font-semibold text-ink">{copy.home.subscribeTitle}</h3>
        <p className="mt-1 text-xs text-paper-muted">
          {copy.home.subscribeBody}
        </p>
        <form onSubmit={onSubscribe} className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            aria-label="Email"
          />
          <Button type="submit" size="sm">
            Sign up
          </Button>
        </form>
        {status ? (
          <p className="mt-2 text-xs text-paper-muted" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </section>
  );
}
