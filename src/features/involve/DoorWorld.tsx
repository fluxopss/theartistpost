import Image from "next/image";
import { copy, links, site } from "@/content/site";
import {
  doorById,
  involveImageAspectClass,
  involveImageFitClass,
  involveImagePlateClass,
  type InvolveDoor,
  type InvolveDoorId,
} from "@/content/involve";
import { InvolveInquiryForm } from "@/features/involve/InvolveInquiryForm";
import { ButtonLink } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import type { InvolveIntent } from "@/lib/ghl";
import {
  giveActions,
  partnerPackages,
  volunteerMissions,
  whatThisFunds,
} from "@/features/participate/content";
import { StudioPassport } from "@/features/participate/StudioPassport";
import type { ContentEvent } from "@/lib/content";

function inquiryIntent(id: InvolveDoorId): InvolveIntent | null {
  switch (id) {
    case "space":
    case "partner":
    case "volunteer":
      return id;
    case "support":
    case "events":
      return null;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function DoorActions({ door }: { door: InvolveDoor }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <ButtonLink
        href={door.primary.href}
        external={door.primary.external}
        className="rounded-full !bg-spark-coral !text-ink"
      >
        {door.primary.label}
      </ButtonLink>
      {door.secondary ? (
        <ButtonLink
          href={door.secondary.href}
          external={door.secondary.external}
          variant="outline"
          className="rounded-full"
        >
          {door.secondary.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function DoorWorld({
  doorId,
  events,
}: {
  doorId: InvolveDoorId;
  events: ContentEvent[];
}) {
  const door = doorById(doorId);
  const intent = inquiryIntent(door.id);

  return (
    <article
      id={`door-${door.id}`}
      className="rounded-[1.75rem] border border-line bg-surface-glass p-5 sm:p-7"
    >
      <div
        className={cn(
          "relative mb-5 overflow-hidden rounded-2xl border border-line",
          involveImagePlateClass(door.id),
          involveImageAspectClass(door.imageFit),
        )}
      >
        <Image
          src={door.image}
          alt={door.imageAlt}
          fill
          unoptimized
          className={involveImageFitClass(door.imageFit)}
          sizes="(max-width: 1024px) 100vw, 32rem"
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
        {door.index} · {door.kicker}
      </p>
      <h2 className="display mt-2 text-3xl text-paper">{door.title}</h2>
      <p className="mt-2 text-sm italic text-paper-muted">{door.invitation}</p>
      <p className="mt-3 text-sm leading-relaxed text-paper-muted sm:text-base">
        {door.detail}
      </p>
      {door.id === "space" ? (
        <p className="mt-3 text-sm text-paper-muted">{copy.involve.spaceAfter}</p>
      ) : null}
      <DoorActions door={door} />

      {door.id === "space" ? <SpaceWorld /> : null}
      {door.id === "partner" ? <PartnerWorld /> : null}
      {door.id === "support" ? <SupportWorld /> : null}
      {door.id === "volunteer" ? <VolunteerWorld /> : null}
      {door.id === "events" ? <EventsWorld events={events} /> : null}

      {intent ? (
        <div className="mt-8 border-t border-line pt-8">
          <InvolveInquiryForm intent={intent} />
          <p className="mt-4 text-xs text-paper-muted">
            Native flow is opening. Until then, Robbie also reads the{" "}
            <a
              href={links.artistAgreement}
              className="text-spark-teal underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Google Form agreement
            </a>{" "}
            for artist space.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function SpaceWorld() {
  return (
    <div className="mt-8 space-y-4">
      <ol className="space-y-3">
        <li className="rounded-2xl border border-line bg-ink/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
            Step 1
          </p>
          <p className="mt-1 text-sm text-paper">{copy.schedule.step1}</p>
        </li>
        <li className="rounded-2xl border border-line bg-ink/20 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
            Step 2
          </p>
          <p className="mt-1 text-sm text-paper">{copy.schedule.step2}</p>
        </li>
      </ol>
      <StudioPassport />
    </div>
  );
}

function PartnerWorld() {
  return (
    <ul className="mt-8 space-y-3">
      {partnerPackages.map((pkg) => (
        <li
          key={pkg.id}
          className="rounded-2xl border border-line bg-ink/20 px-4 py-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
            {pkg.kicker}
          </p>
          <h3 className="display mt-1 text-xl text-paper">{pkg.title}</h3>
          <p className="mt-2 text-sm text-paper-muted">{pkg.body}</p>
          <a
            href={pkg.href}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-spark-teal underline-offset-4 hover:underline"
          >
            {pkg.cta}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SupportWorld() {
  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-paper-muted">
        {copy.about.supportBody} Venmo{" "}
        <span className="font-semibold text-paper">{site.venmo}</span>
      </p>
      <ul className="space-y-3">
        {whatThisFunds.map((item) => (
          <li key={item.id} className="border-l-2 border-spark-gold/50 pl-4">
            <h3 className="display text-lg text-paper">{item.title}</h3>
            <p className="mt-1 text-sm text-paper-muted">{item.body}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        {giveActions.map((action) => (
          <ButtonLink
            key={action.id}
            href={action.href}
            external={action.external}
            variant="outline"
            className="rounded-full"
          >
            {action.label}
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}

function VolunteerWorld() {
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {volunteerMissions.map((mission) => (
        <li
          key={mission.id}
          className="rounded-2xl border border-line bg-ink/20 px-4 py-4"
        >
          <h3 className="display text-lg text-paper">{mission.title}</h3>
          <p className="mt-2 text-sm text-paper-muted">{mission.body}</p>
        </li>
      ))}
    </ul>
  );
}

function EventsWorld({ events }: { events: ContentEvent[] }) {
  return (
    <div className="mt-8 space-y-3">
      {events.map((event) => (
        <a
          key={event.id}
          href={`/event/${event.id}`}
          className="block rounded-2xl border border-line bg-ink/20 px-4 py-4 transition hover:border-spark-teal"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-coral">
            {event.comingSoon ? "Being prepared" : event.medium}
          </p>
          <h3 className="display mt-1 text-lg text-paper">{event.title}</h3>
          <p className="mt-1 text-sm text-paper-muted">{event.venue}</p>
        </a>
      ))}
      <ButtonLink
        href="/kindness-always"
        variant="outline"
        className="rounded-full"
      >
        Leave a kindness for a night
      </ButtonLink>
    </div>
  );
}
