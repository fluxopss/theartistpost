"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { involveDoors, doorHref, type InvolveDoor } from "@/content/involve";
import { copy } from "@/content/site";
import { useIsTouchDevice, useReducedMotion } from "@/hooks/useMedia";
import { cn } from "@/shared/lib/cn";

function sparkTone(spark: InvolveDoor["spark"]): string {
  switch (spark) {
    case "coral":
      return "house-door--coral";
    case "gold":
      return "house-door--gold";
    case "teal":
      return "house-door--teal";
    default: {
      const _exhaustive: never = spark;
      return _exhaustive;
    }
  }
}

export function HouseDoors() {
  const touch = useIsTouchDevice();
  const reduce = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  const onActivate = useCallback(
    (door: InvolveDoor, event: React.MouseEvent | React.KeyboardEvent) => {
      if (!touch || reduce) return;
      if (openId !== door.id) {
        event.preventDefault();
        setOpenId(door.id);
      }
    },
    [touch, reduce, openId],
  );

  return (
    <nav
      aria-label="Five doors into the house"
      className="house-hall"
    >
      <ol className="house-hall__row">
        {involveDoors.map((door) => {
          const peeked = touch && openId === door.id;
          return (
            <li key={door.id} className="house-hall__item">
              <Link
                href={doorHref(door.id)}
                className={cn(
                  "house-door",
                  sparkTone(door.spark),
                  peeked && "is-open",
                )}
                aria-describedby={`door-invite-${door.id}`}
                onClick={(e) => onActivate(door, e)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    if (touch && openId !== door.id) {
                      e.preventDefault();
                      setOpenId(door.id);
                    }
                  }
                }}
              >
                <span className="house-door__frame">
                  <span className="house-door__leaf" aria-hidden>
                    <span className="house-door__panel">
                      <span className="house-door__index">{door.index}</span>
                      <span className="house-door__kicker">{door.kicker}</span>
                      <span className="house-door__title">{door.title}</span>
                    </span>
                  </span>
                  <span className="house-door__room">
                    <Image
                      src={door.image}
                      alt=""
                      fill
                      unoptimized
                      className={cn(
                        "house-door__glimpse",
                        door.imageFit === "contain" && "object-contain p-3",
                      )}
                      sizes="(max-width: 768px) 70vw, 20vw"
                    />
                    <span className="house-door__glow" />
                  </span>
                </span>
                <span
                  id={`door-invite-${door.id}`}
                  className="house-door__invite"
                >
                  {door.invitation}
                  <span className="house-door__enter">{copy.house.enter}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
