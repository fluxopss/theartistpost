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
    <section className="mx-auto max-w-[var(--content-max)] px-4 py-12 sm:px-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
          <h2 className="display text-2xl text-ink sm:text-3xl">
            {copy.home.contactTitle}
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink sm:text-base">
            {copy.home.contactLead}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-paper-muted sm:text-base">
            {copy.home.contactBody}
          </p>
          <p className="mt-4 text-sm text-paper-muted">{site.address.full}</p>
          <p className="mt-1 text-sm text-paper-muted">
            Open today {site.hoursToday}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={`mailto:${site.email}`}>
              {copy.home.dropLine}
            </ButtonLink>
            <ButtonLink href={site.mapsUrl} external variant="outline">
              {copy.home.getDirections}
            </ButtonLink>
          </div>
        </div>

        <div className="rounded-2xl border border-line p-6 sm:p-8">
          <h3 className="display text-xl text-ink">
            {copy.home.subscribeTitle}
          </h3>
          <p className="mt-2 text-sm text-paper-muted">
            {copy.home.subscribeBody}
          </p>
          <form onSubmit={onSubscribe} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
              aria-label="Email"
            />
            <Button type="submit">Sign up</Button>
          </form>
          {status ? (
            <p className="mt-3 text-sm text-paper-muted" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
