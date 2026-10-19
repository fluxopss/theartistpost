# Web Community (App Parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** The app's community board on theartistpost.org: read the board, open a conversation, react, reply, post (with a photo), see who reacted, report, block, delete your own — same data as the app.

**Architecture:** Same pattern as Phase 1 (#41). Server pages read with the same `src/server/api/community.ts` functions the `/api/v1/community*` routes use, passing the cookie viewer. Every write goes through the existing `/api/v1` routes via `webApi`. Display rules (kinds, reactions, mentions, time, report reasons) are ported from the app's `src/domain/*` so both surfaces read the same.

**Tech Stack:** Next.js 16.3, React 19, Tailwind 4, Prisma 6, vitest.

**Spec:** Jonathan 2026-10-18: "Sync the community from the app to the website." Source of truth: app `src/screens/community`, `compose-community`, `reactors`, `report`, `components/community-card.tsx`, `domain/community/*`, `domain/safety/reasons.ts`, `domain/activity/time.ts`.

## Global Constraints
- No `/api/v1` shape changes. Writes only through existing routes: `GET/POST /community`, `GET/DELETE /community/[id]`, `PUT/DELETE /community/[id]/reaction` `{reaction}`, `GET /community/[id]/reactions`, `POST /community/media` (multipart `file` → `{url}`), `POST /reports` `{targetType:"COMMUNITY_POST", targetId, reason, note?}`, `POST /blocks` `{handle}`.
- Body 1–500 graphemes; kinds SHOUTOUT, COLLAB, SHOWING, ASK, KINDNESS, UPDATE; reactions SUPPORT, LOVE, FIRE, APPLAUSE, INSPIRED (kind-only, no ranking by reactions); replies one level deep.
- Posting/reacting/replying needs a community member (handle + guidelines); signed-out → `joinHref(here)`, not ready → "Finish your profile" link to `/settings/profile`.
- Session-reading pages are `force-dynamic`; community pages are unlisted (`noindex`) — members' posts are not search content.
- Copy: warm, plain, kindness-first. No tester language.

## Review Focus
1. A 403 (not a member yet) or 429 on react/reply/post never loses typed text and never shows a broken state.
2. Blocked/hidden/deleted post opened by link → calm "That post is gone", not a crash.
3. Body with 500 emoji counts as 500 (graphemes), not 1000 UTF-16 units.
4. @mentions link to `/u/<handle>` and can't inject markup; URLs in body are plain text.
5. Image upload failure (too big/wrong type) keeps the draft and says why.

## Tasks
- C1 Domain ports + parity tests vs server constants (kinds, reactions, report reasons, mentions, time, graphemes).
- C2 `communityGate` server helper + `webApi` PUT.
- C3 `CommunityCard`, `ReactionBar`, `PostActions` (report/block/delete).
- C4 `/community` feed (scope/kind/topic filters, load more) + "Community" in header nav.
- C5 `/community/[id]` thread + `ReplyBox`; `/community/[id]/reactions`.
- C6 `/community/new` composer with photo.
- C7 `/u/[handle]` recent posts use `CommunityCard`.
- Final: fresh whole-branch review, gates, PR (merge waits for Jonathan).
