export type BoardScope = "foryou" | "all" | "following";

/** Members with topics land on For You; everyone else sees the whole board. */
export function defaultBoardScope(input: { signedIn: boolean; topicCount: number }): BoardScope {
  return input.signedIn && input.topicCount > 0 ? "foryou" : "all";
}

/** For You is only meaningful once there are topics to rank by. */
export function needsTopicsPrompt(input: {
  scope: BoardScope;
  signedIn: boolean;
  topicCount: number;
}): boolean {
  return input.scope === "foryou" && input.signedIn && input.topicCount === 0;
}
