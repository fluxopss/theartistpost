import type { Metadata } from "next";
import { FollowListPage } from "@/features/people/FollowList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Followers",
  robots: { index: false, follow: true },
};

export default function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  return FollowListPage({ side: "followers", params, searchParams });
}
