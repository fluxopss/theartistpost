// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("@/server/api/__tests__/testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import {
  createCommentAction,
  toggleLikeAction,
} from "@/features/posts/engagement";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { SUSPENDED_ERROR } from "@/server/api/session";
import { KIND_MESSAGE } from "@/server/api/textFilter";
import {
  artistRow,
  db,
  resetDb,
  userRow,
} from "@/server/api/__tests__/testkit";

const member = userRow({ id: "user_member", email: "member@example.com" });
const author = artistRow("painter");

const post = {
  id: "post_1",
  slug: "sunset-mural",
  title: "Sunset mural",
  authorId: author.id,
  author,
  _count: { likes: 2 },
};

beforeEach(() => {
  resetDb();
  resetRateLimits();
  getSession.mockReset();
  getSession.mockResolvedValue({
    id: member.id,
    email: "Member@Example.com",
    name: member.name,
    role: "VIEWER",
  });
  db.user.findUnique.mockResolvedValue(member);
  db.post.findFirst.mockResolvedValue(post);
  db.comment.create.mockImplementation(async ({ data }: { data: { body: string } }) => ({
    id: "c_1",
    body: data.body,
    createdAt: new Date("2026-10-27T12:00:00Z"),
  }));
  db.like.count.mockResolvedValue(3);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createCommentAction matches the v1 rules", () => {
  it("saves a kind note from an active member (email looked up lowercased)", async () => {
    const result = await createCommentAction({ postId: "post_1", body: "Love the colors" });
    expect(result).toMatchObject({ ok: true, comment: { body: "Love the colors" } });
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "member@example.com" } }),
    );
  });

  it("refuses a suspended account", async () => {
    db.user.findUnique.mockResolvedValue({ ...member, suspendedAt: new Date() });
    const result = await createCommentAction({ postId: "post_1", body: "hello" });
    expect(result).toEqual({ ok: false, error: SUSPENDED_ERROR });
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("screens text the same way (slurs and link spam)", async () => {
    const slur = await createCommentAction({ postId: "post_1", body: "you fag" });
    expect(slur).toEqual({ ok: false, error: KIND_MESSAGE });
    const spam = await createCommentAction({
      postId: "post_1",
      body: "https://a.example https://b.example https://c.example",
    });
    expect(spam).toEqual({ ok: false, error: KIND_MESSAGE });
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("refuses a post whose author is in a block with the commenter", async () => {
    db.block.findMany.mockResolvedValue([
      { blockerId: author.id, blockedId: member.id },
    ]);
    const result = await createCommentAction({ postId: "post_1", body: "hi" });
    expect(result.ok).toBe(false);
    expect(db.comment.create).not.toHaveBeenCalled();
  });
});

describe("toggleLikeAction matches the v1 rules", () => {
  it("likes for an active member", async () => {
    const result = await toggleLikeAction({ postId: "post_1" });
    expect(result).toEqual({ ok: true, liked: true, likeCount: 3 });
  });

  it("refuses a suspended account", async () => {
    db.user.findUnique.mockResolvedValue({ ...member, suspendedAt: new Date() });
    const result = await toggleLikeAction({ postId: "post_1" });
    expect(result).toEqual({ ok: false, error: SUSPENDED_ERROR });
    expect(db.like.create).not.toHaveBeenCalled();
  });

  it("refuses a post whose author is in a block with the viewer", async () => {
    db.block.findMany.mockResolvedValue([
      { blockerId: member.id, blockedId: author.id },
    ]);
    const result = await toggleLikeAction({ postId: "post_1" });
    expect(result.ok).toBe(false);
    expect(db.like.create).not.toHaveBeenCalled();
  });
});
