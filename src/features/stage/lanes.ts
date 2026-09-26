import type { WallFilters, WallPiece } from "@/features/wall/types";
import { tapGenres, type TapGenre } from "@/content/stage";

/** Wall mediums a TAP genre can honestly open. Shared lanes are called out in the line. */
type LaneMedium = Exclude<WallFilters["medium"], "all">;

export type TapLane = TapGenre & {
  medium: LaneMedium;
  wallLine: string;
};

const laneFacts: Record<
  TapGenre["id"],
  { medium: LaneMedium; wallLine: string }
> = {
  music: {
    medium: "music",
    wallLine: "Musicians. The music frames are lit.",
  },
  photo: {
    medium: "visual",
    wallLine:
      "Photographers. Visual frames — models share this lane until a named artist is hung.",
  },
  dance: {
    medium: "dance",
    wallLine: "Dancers. The dance frame is lit.",
  },
  film: {
    medium: "multidisciplinary",
    wallLine: "Filmmakers. Picture and sound share the multi-medium frame.",
  },
  stage: {
    medium: "theater",
    wallLine: "Actors. Theater frames — comedians share this lane.",
  },
  laugh: {
    medium: "theater",
    wallLine: "Comedians. Theater frames — actors share this lane.",
  },
  frame: {
    medium: "visual",
    wallLine:
      "Models. Visual frames — photographers share this lane until a named artist is hung.",
  },
};

export function tapLane(id: string | null | undefined): TapLane | null {
  if (!id) return null;
  const genre = tapGenres.find((item) => item.id === id);
  const facts = genre ? laneFacts[genre.id] : undefined;
  if (!genre || !facts) return null;
  return { ...genre, ...facts };
}

export function laneHref(id: TapGenre["id"]): string {
  return `/explore?lane=${id}`;
}

export function allLanes(): TapLane[] {
  return tapGenres.map((genre) => {
    const lane = tapLane(genre.id);
    if (!lane) throw new Error(`Missing lane for ${genre.id}`);
    return lane;
  });
}

/** Center a wall piece in the viewport at a given scale. */
export function focusPan(
  piece: Pick<WallPiece, "x" | "y" | "w" | "h">,
  view: { width: number; height: number },
  scale: number,
): { x: number; y: number } {
  return {
    x: view.width / 2 - (piece.x + piece.w / 2) * scale,
    y: view.height / 2 - (piece.y + piece.h / 2) * scale,
  };
}

export const LANE_FOCUS_SCALE = 0.78;
