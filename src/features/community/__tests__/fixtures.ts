import type { CommunityPostDTO } from "@/server/api/communityDto";

export function makePost(over: Partial<CommunityPostDTO> = {}): CommunityPostDTO {
  return {
    id: "p1",
    kind: "SHOUTOUT",
    body: "Huge love to @robbi for the mural",
    imageUrl: null,
    topic: { slug: "murals", name: "Murals", kind: "genre" },
    parentId: null,
    author: { handle: "rae", name: "Rae Lin", avatarUrl: null, isArtist: true },
    supportCount: 2,
    replyCount: 1,
    viewerSupported: false,
    reactionCounts: { SUPPORT: 1, LOVE: 1, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 },
    viewerReaction: null,
    canDelete: false,
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    ...over,
  };
}
