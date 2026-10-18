"use client";

import dynamic from "next/dynamic";

/**
 * The edit form reads this browser's saved draft while it initializes, so it
 * renders on the client only (no server/client mismatch). Signed-in, noindex
 * page: nothing is lost by skipping server HTML for the form itself.
 */
export const EditProfileClient = dynamic(
  () => import("@/features/account/EditProfileForm").then((m) => m.EditProfileForm),
  {
    ssr: false,
    loading: () => <p className="text-sm text-paper-muted">Loading your profile…</p>,
  },
);
