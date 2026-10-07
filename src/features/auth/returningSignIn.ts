/**
 * Returning-user sign-in path selection for /join.
 *
 * Today (Auth PR #15 unmerged / Supabase OTP unset): house HMAC via
 * AuthChallenge — same as POST /api/v1/auth/request-code + /auth/verify —
 * then write the tap_session cookie from a server action.
 *
 * After Auth PR #15 + VPS env: Supabase email OTP → POST /api/v1/auth/link
 * → Prisma User link → tap_session (or Bearer). Prefer a working HMAC door
 * over a half-wired Supabase-only door.
 *
 * Flip with SUPABASE_RETURNING_OTP=1 only when URL + publishable key and
 * /auth/link are live. Partial env alone never switches the door.
 */

export type ReturningAuthMode = "hmac" | "supabase";

export function returningAuthMode(): ReturningAuthMode {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
  const publishable = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
  const optIn = process.env.SUPABASE_RETURNING_OTP === "1";

  if (url && publishable && optIn) {
    return "supabase";
  }
  return "hmac";
}

/** Copy for the returning door — house voice, not social-app jargon. */
export const RETURNING_DOOR_COPY = {
  kicker: "Returning",
  title: "Already have a seat",
  body: "Request a code to the email on your member or studio pass. Same house, same Wall.",
  cta: "Returning door",
  formTitle: "Come back through the side door",
  formBody:
    "We'll send a short code to the email you used when you joined. No password — just proof it's you.",
  codeTitle: "Enter the code",
  codeBody:
    "Check your inbox for a six-digit code. It expires in about ten minutes.",
  requestCta: "Send my code",
  verifyCta: "Open my pass",
  sentHint: "If that email is on file, a code is on its way.",
} as const;

export const RETURNING_SUCCESS_COPY = {
  member: {
    kicker: "Pass restored",
    title: "Welcome back to the house",
    body: "Your member pass is open. Leave a real note on the Wall, or support the mission when you're ready.",
  },
  artistPending: {
    kicker: "Studio session open",
    title: "Welcome back — still pending",
    body: "You're signed in, but Create stays latched until Robbie approves your profile. Install the app so the studio feels like home.",
  },
  artist: {
    kicker: "Studio open",
    title: "Welcome back to the studio",
    body: "Your artist pass is active. Open the Wall, or head to Create when you're ready to hang work.",
  },
  admin: {
    kicker: "House keys",
    title: "Welcome back",
    body: "Your session is open. The Wall and the house tools are ready.",
  },
} as const;
