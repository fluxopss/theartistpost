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
import { InvolvePathRail } from "@/features/involve/InvolvePathRail";
import { ButtonLink } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { cn } from "@/shared/lib/cn";
import type { InvolveIntent } from "@/lib/ghl";

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
        magnetic
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

function SupportExtras() {
  return (
    <p className="mt-4 text-sm text-paper-muted">
      {copy.about.supportBody} Venmo{" "}
      <span className="font-semibold text-paper">{site.venmo}</span>
      {" · "}
      <a href={links.donate} className="text-spark-teal hover:underline">
        PayPal donate
      </a>
    </p>
  );
}

export function InvolveExperience({
  initialDoor,
}: {
  initialDoor: InvolveDoorId;
}) {
  const door = doorById(initialDoor);
  const intent = inquiryIntent(door.id);

  return (
    <PageShell className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
      <InvolvePathRail selected={door.id} heading="Choose a door" />

      <article
        id={`door-${door.id}`}
        className="rounded-3xl border border-line bg-surface-glass p-5 sm:p-7"
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
            sizes="(max-width: 1024px) 100vw, 28rem"
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
          {door.index} · {door.kicker}
        </p>
        <h2 className="display mt-2 text-3xl text-paper">{door.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-paper-muted sm:text-base">
          {door.detail}
        </p>
        {door.id === "space" ? (
          <p className="mt-3 text-sm text-paper-muted">
            {copy.involve.spaceAfter}
          </p>
        ) : null}
        <DoorActions door={door} />
        {door.id === "support" ? <SupportExtras /> : null}

        {intent ? (
          <div className="mt-8 border-t border-line pt-8">
            <InvolveInquiryForm intent={intent} />
          </div>
        ) : null}
      </article>
    </PageShell>
  );
}
