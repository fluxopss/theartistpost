import { NextResponse } from "next/server";
import { clampPostsTake, getPosts } from "@/features/posts/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const take = Number(searchParams.get("take") ?? "9");

  const result = await getPosts({
    cursor,
    tag,
    // Capped at POSTS_MAX_TAKE (24) so one request cannot pull the whole wall.
    take: clampPostsTake(Number.isFinite(take) ? take : 9),
  });

  return NextResponse.json(result);
}
