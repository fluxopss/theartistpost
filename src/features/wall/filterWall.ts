import type { WallFilters, WallPiece } from "./types";

export function filterWallPieces(
  pieces: WallPiece[],
  filters: WallFilters,
  now = new Date(),
): WallPiece[] {
  return pieces.filter((piece) => {
    if (filters.medium !== "all" && piece.medium !== filters.medium) {
      return false;
    }
    if (
      filters.neighborhood !== "all" &&
      piece.neighborhood !== filters.neighborhood
    ) {
      return false;
    }
    if (
      filters.availability !== "all" &&
      piece.availability !== filters.availability
    ) {
      return false;
    }
    if (filters.date === "upcoming") {
      if (!piece.showcaseDate) return false;
      return new Date(piece.showcaseDate).getTime() >= now.getTime();
    }
    return true;
  });
}
