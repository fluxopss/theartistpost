import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  involveDoors,
  involveImageFitClass,
  involveImagePlateClass,
  type InvolveDoor,
  type InvolveDoorId,
  type InvolveSpark,
} from "@/content/involve";
import { cn } from "@/shared/lib/cn";

function sparkClass(spark: InvolveSpark): string {
  switch (spark) {
    case "coral":
      return "text-spark-coral";
    case "gold":
      return "text-spark-gold";
    case "teal":
      return "text-spark-teal";
    default: {
      const _exhaustive: never = spark;
      return _exhaustive;
    }
  }
}

function DoorRow({
  door,
  selected,
  href,
}: {
  door: InvolveDoor;
  selected?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 border-b border-line px-1 py-5 transition sm:grid-cols-[8.5rem_1fr_auto] sm:gap-6",
        selected
          ? "bg-accent-soft"
          : "hover:bg-surface-hover/60",
      )}
      aria-current={selected ? "page" : undefined}
    >
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-lg border border-line",
          involveImagePlateClass(door.id),
        )}
      >
        <Image
          src={door.image}
          alt=""
          fill
          unoptimized
          className={cn(
            "transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            involveImageFitClass(door.imageFit),
          )}
          sizes="140px"
        />
      </div>
      <div className="min-w-0 text-left">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.22em]",
            sparkClass(door.spark),
          )}
        >
          {door.index} · {door.kicker}
        </p>
        <h3 className="display mt-1 text-xl text-paper sm:text-2xl">
          {door.title}
        </h3>
        <p className="mt-1 truncate text-sm text-paper-muted sm:whitespace-normal">
          {door.summary}
        </p>
      </div>
      <ArrowUpRight
        className="h-5 w-5 shrink-0 text-paper-muted transition group-hover:text-spark-teal"
        aria-hidden
      />
    </Link>
  );
}

export function InvolvePathRail({
  selected,
  heading,
}: {
  selected?: InvolveDoorId;
  heading?: string;
}) {
  return (
    <nav aria-label="Ways to get involved">
      {heading ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-gold">
          {heading}
        </p>
      ) : null}
      <div className="border-t border-line">
        {involveDoors.map((door) => (
          <DoorRow
            key={door.id}
            door={door}
            selected={selected === door.id}
            href={`/get-involved?door=${door.id}`}
          />
        ))}
      </div>
    </nav>
  );
}
