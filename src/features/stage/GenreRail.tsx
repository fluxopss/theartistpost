"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { tapOrigin } from "@/content/stage";
import { cn } from "@/shared/lib/cn";
import { allLanes, tapLane } from "./lanes";

function Rail({
  variant,
  className,
  activeId,
}: {
  variant: "stage" | "strip";
  className?: string;
  activeId: string | null;
}) {
  const lanes = allLanes();

  return (
    <div
      className={cn(
        "genre-stage",
        variant === "strip" && "genre-stage--strip",
        className,
      )}
    >
      {variant === "stage" ? (
        <p className="genre-stage__kicker">{tapOrigin.kicker}</p>
      ) : null}
      <ul className="genre-rail" aria-label="Genres on the original TAP stage">
        {lanes.map((genre) => {
          const current = activeId === genre.id;
          return (
            <li key={genre.id}>
              <Link
                href={`/explore?lane=${genre.id}`}
                className={cn(
                  "genre-sticker",
                  `genre-sticker--${genre.tone}`,
                  current && "is-current",
                )}
                style={{ ["--tilt" as string]: current ? "0deg" : genre.tilt }}
                aria-current={current ? "page" : undefined}
              >
                {genre.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {variant === "stage" ? (
        <p className="genre-stage__line">
          {tapLane(activeId)?.wallLine ?? tapOrigin.line}
        </p>
      ) : null}
    </div>
  );
}

function RailQuery(props: {
  variant: "stage" | "strip";
  className?: string;
}) {
  const activeId = useSearchParams().get("lane");
  return <Rail {...props} activeId={activeId} />;
}

/** Horizontal sticker rail. Each genre opens its frames on The Wall. */
export function GenreRail({
  variant = "stage",
  className,
}: {
  variant?: "stage" | "strip";
  className?: string;
}) {
  return (
    <Suspense fallback={<Rail variant={variant} className={className} activeId={null} />}>
      <RailQuery variant={variant} className={className} />
    </Suspense>
  );
}
