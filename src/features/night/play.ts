/** Play on the night pass — pure, so the room can stay honest. */

export function nextLitRooms(lit: readonly string[], roomId: string): string[] {
  if (lit.includes(roomId)) return lit.filter((id) => id !== roomId);
  return [...lit, roomId];
}

export function floorWalked(
  lit: readonly string[],
  rooms: readonly { id: string }[],
): boolean {
  if (rooms.length === 0) return false;
  return rooms.every((room) => lit.includes(room.id));
}

/** A downward pull past this many pixels tears the stub. A click still opens it. */
export const TEAR_THRESHOLD = 36;

export function tearShouldOpen(pullPx: number): boolean {
  return pullPx >= TEAR_THRESHOLD;
}

export function clampTearPull(pullPx: number, max = 84): number {
  if (pullPx <= 0) return 0;
  return Math.min(pullPx, max);
}
