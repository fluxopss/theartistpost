"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { webApi } from "@/features/account/webApi";
import { joinHref } from "@/shared/lib/safeNext";
import { cn } from "@/shared/lib/cn";

type Props = {
  handle: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  followingCount: number;
  postCount: number;
  signedIn: boolean;
  isSelf: boolean;
  followsViewer: boolean;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Profile counts + Follow, on the same follow graph the app uses. */
export function FollowBar({
  handle,
  initialFollowing,
  initialFollowerCount,
  followingCount,
  postCount,
  signedIn,
  isSelf,
  followsViewer,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const base = `/u/${encodeURIComponent(handle)}`;

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const before = { following, followerCount };
    setFollowing(!following);
    setFollowerCount(Math.max(0, followerCount + (following ? -1 : 1)));

    const result = await webApi<{ following: boolean; followerCount: number }>(
      `/people/${encodeURIComponent(handle)}/follow`,
      { method: "POST" },
    );
    if (result.ok) {
      setFollowing(result.data.following);
      setFollowerCount(result.data.followerCount);
    } else {
      setFollowing(before.following);
      setFollowerCount(before.followerCount);
      setError(result.status === 429 ? "Try again in a moment." : result.error.message);
    }
    inFlight.current = false;
    setBusy(false);
  }

  const pill =
    "inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold transition";

  return (
    <div className="not-prose flex flex-wrap items-center gap-x-5 gap-y-3">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-paper-muted">
        <Link href={`${base}/followers`} className="hover:text-paper">
          <strong className="text-paper">{followerCount}</strong>{" "}
          {followerCount === 1 ? "follower" : "followers"}
        </Link>
        <Link href={`${base}/following`} className="hover:text-paper">
          <strong className="text-paper">{followingCount}</strong> following
        </Link>
        <span>{plural(postCount, "post", "posts")}</span>
        {followsViewer ? (
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-paper">Follows you</span>
        ) : null}
      </p>

      {isSelf ? (
        <Link href="/settings/profile" className={cn(pill, "border border-line text-paper hover:border-spark-teal")}>
          Edit profile
        </Link>
      ) : !signedIn ? (
        <Link href={joinHref(base)} className={cn(pill, "bg-spark-teal text-ink hover:brightness-110")}>
          Follow
        </Link>
      ) : (
        <button
          type="button"
          aria-pressed={following}
          aria-busy={busy}
          onClick={() => void toggle()}
          className={cn(
            pill,
            following
              ? "border border-line text-paper hover:border-spark-coral"
              : "bg-spark-teal text-ink hover:brightness-110",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      )}

      {error ? (
        <p role="status" className="w-full text-xs text-spark-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
