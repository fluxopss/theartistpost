# The Artist Post — Community v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn The Artist Post from a curated gallery app into a living artist community — every member gets a real profile (photo, bio, topics, home chapter), can follow people, post to a community board (shout-outs, collab calls, "I'm showing at…", kindness), get notified, and is protected by report / block / moderation — ready for a TestFlight build on **Fri 2026-10-23**.

**Architecture:** The Next.js web repo (`fluxopss/theartistpost`) is the backend: one additive Prisma migration plus new `/api/v1` route handlers whose logic lives in `src/server/api/*.ts` (route files stay thin, exactly like `posts/[slug]/like`). The Expo app (`fluxopss/theartistpost-app`) consumes the contract below through `src/api/types.ts` + `src/api/hooks.ts` (TanStack Query), with screens in `src/screens/*` and thin routes in `src/app/*`.

**Tech Stack:** Next.js 16 · React 19 · Prisma 6 / Postgres · zod 4 · vitest (mocked Prisma) — Expo SDK 57 · expo-router NativeTabs · TanStack Query 5 · expo-image-picker + expo-image-manipulator · jest-expo.

**Spec (sources, in priority order):**
1. Robbi's founding principles — Flux Mind `mem_k0yuic4bwo3o` (Artists First, Venue Partnerships, Sponsorship Model, Community Engagement, Kindness Always).
2. Robbi's foundation brief + build guide — `mem_814vtyfl16d7`, `mem_l8ouobjiv5b9` (hierarchy, one account/many roles, audit, moderation, chapters).
3. Jonathan's direction 2026-10-14: "a full-blown, strong-standing social media app mixed with real-life interaction of artists supporting each other": profile creation, profile pictures, bios, topics; interactive; artists can communicate; TestFlight re-test release next Friday.
4. App Store Guideline 1.2 (UGC: filter, report, block, timely response, terms accepted) and 5.1.1(v) (in-app account deletion) — from the existing store plan `C:\Users\jonat\.claude\plans\the-artist-post-is-gleaming-chipmunk.md` §P4.

## Product decisions (chief engineer, 2026-10-14)

| # | Decision | Why |
|---|---|---|
| D1 | **Every** account gets a profile (handle, avatar, bio, headline, location, home chapter, topics). Artists keep their `ArtistProfile` (approval + Wall publishing) on top. | Social app ≠ artists-only; brief says one account, many roles. |
| D2 | **The Wall stays curated** (approved artists only). The new **Community board** is open to every member who accepted the Community Guidelines. | Keeps the gallery's quality; gives everyone a voice. |
| D3 | Community post kinds: `SHOUTOUT` (lift up another artist), `COLLAB` (looking for collaborators), `SHOWING` (where my work is / I'll be performing), `ASK` (question / need help), `KINDNESS` (kindness note), `UPDATE` (studio update). | "Artists supporting each other" in real life, not likes-for-likes. |
| D4 | Community reaction is **Support** (one tap, sparkle), not a like counter race. Wall posts keep Likes. | Kindness Always. |
| D5 | Topics = curated `Topic` table seeded with TAP's seven genres + Visual Artists. Robbi can rename/add later (data, not code). | Brief: configurable data, not enums. |
| D6 | Home chapter = `User.chapterId` holding an existing content chapter id (`content.getChapters()`), no FK yet. Brief Step 2 later promotes it to a real `Chapter` row. | Forward-compatible, additive. |
| D7 | Tabs become **Home · Wall · Community · Schedule · You**. Kindness moves *into* Community (a "Kindness" kind + a card linking to the existing kindness wall screen, which stays). | iOS shows 5 tabs max before "More"; community is the heart. |
| D8 | In-app notifications only. **Push notifications are v1.1** (contact tripwire → Jonathan's GO). | Safe for TestFlight. |
| D9 | **Direct messages are v1.1** (behind flag `messaging`, mutual follows only). v1 conversation = comments, replies, @mentions. | DMs need moderation tooling Robbi must staff first. |
| D10 | Safety: report (any content or person), block (two-way invisibility), auto-hide at 3 open reports, admin queue (hide / dismiss / suspend), suspended users read-only, guidelines accepted before first post, in-app delete account. | App Store 1.2 + 5.1.1(v); Kindness Always. |
| D11 | No fees, paywalls or paid tiers anywhere in this work. No seeded/fake people or posts — empty states only. | Principles 1 & honesty rule. |

## Global Constraints

- Never push to `main` of either repo. Branch `feat/community-v1` in each repo; open PRs; **no merge** without Jonathan's explicit GO. Web `main` = production within ~3 min.
- Migration is **additive only** (`prisma/migrations/20261015000000_community_v1/migration.sql`); never run it against production — Jonathan's GO + a `pg_dump` come first.
- Web: every response uses the envelope in `src/server/api/respond.ts` (`apiOk` / `apiError` / `withApiErrors`). Route files only parse params, call one `src/server/api/*` function, and map the result.
- Web: every write calls `writeAuditLog(prisma, { actorId, action, targetType, targetId, meta })` from `src/features/posts/audit.ts`. Action names: `<noun>.<verb>` (e.g. `follow.create`, `community.post_create`, `report.create`, `user.delete`).
- Web: rate-limit every write with `checkRateLimit(key, { windowMs, max })` from `src/features/auth/rateLimit.ts`; key prefix `v1:<feature>:<userId>`.
- Handles: lowercase, `^[a-z0-9_-]{2,40}$` (same rule as `artistJoinSchema` in `src/features/auth/register.ts`), reserved list rejected (`admin`, `theartistpost`, `tap`, `support`, `studioguest`, `api`, `settings`, `me`, `u`).
- Text limits: community body 1–500 chars; bio ≤ 480; headline ≤ 80; location ≤ 60; reply = community post with `parentId`.
- App: tokens only from `@/theme`; text via `@/components/themed-text`; no hex/fontSize literals outside `src/theme/`. Navigation only via `expo-router`. Add native deps only with `npx expo install`.
- Honesty: never invent people, posts, events, counts. Every list has an honest empty state.
- Tests: web `pnpm test`, `pnpm exec next typegen && pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`; app `npm run typecheck`, `npm run lint`, `npm test`. All green before a task is "done". Commit after every task with a conventional message ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Blocked users leaking** — a blocked (either direction) person's posts, replies, comments, profile and notifications must vanish for the other side, including in `/people` search and followers lists. Tested in W6.
2. **Hidden / suspended content** — `hiddenAt` posts/comments never appear in public reads (lists, detail, reply counts); suspended users get `forbidden` on every write but can still read and delete their account. Tested in W6.
3. **Handle collisions** — a member picking a handle already used by an artist's `ArtistProfile.handle` (pre-backfill drift) or by another user, case-insensitively, gets `conflict` with `fields.handle`. Tested in W2.
4. **Account deletion completeness** — deleting removes the user's follows (both sides), reactions, community posts + their replies' parent link, notifications (as recipient and actor), blocks, reports filed, and topic links; audit row keeps only a SHA-256 of the email. Tested in W2.
5. **Self-actions** — following yourself, blocking yourself, reporting yourself, notifying yourself: all rejected/no-ops. Tested in W3/W5/W6.

---

## File structure

**Web (`theartistpost/`)**

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | + models below |
| `prisma/migrations/20261015000000_community_v1/migration.sql` | generated additive SQL + handle backfill + topic seed |
| `src/server/api/handles.ts` | `normalizeHandle`, `isReservedHandle`, `handleSchema`, `isHandleAvailable` |
| `src/server/api/textFilter.ts` | `screenText` — blocklist + link cap |
| `src/server/api/people.ts` | person DTOs, profile read, search/suggested, follow toggle, follower lists |
| `src/server/api/meProfile.ts` | extend PATCH (all profile fields + topics); avatar; terms; delete account |
| `src/server/api/topics.ts` | list topics |
| `src/server/api/community.ts` | list/create/detail/delete/support, mentions |
| `src/server/api/notifications.ts` | `notify()`, list, mark read |
| `src/server/api/safety.ts` | blocks, reports, auto-hide, admin queue, `blockedIdsFor()`, `requireCommunityMember()` |
| `src/server/api/feed.ts` | add `kind=following` |
| `src/server/api/engagement.ts` | blocked/hidden filtering in comments; notify on like/comment; `screenText` on comments |
| `src/app/api/v1/**/route.ts` | thin routes listed in the contract |
| `src/app/u/[handle]/page.tsx` | public web profile (share link target) |
| `src/app/delete-account/page.tsx` | Play Store deletion URL page |
| `src/features/posts/denylist.ts` | hide the prod E2E seed post (task W0) |

**App (`theartistpost-app/`)**

| File | Responsibility |
|---|---|
| `src/api/types.ts`, `src/api/hooks.ts` | contract types + query/mutation hooks |
| `src/domain/people/handle.ts` (+test) | client handle validation mirroring server |
| `src/domain/community/compose.ts` (+test) | kinds, labels, body limits, mention extraction |
| `src/app/(tabs)/_layout.tsx` + group folder rename | five tabs incl. Community, "You" |
| `src/screens/community/*`, `src/app/compose-community.tsx`, `.../community/[id].tsx` | board, composer, thread |
| `src/screens/person/*`, `.../person/[handle].tsx`, `.../people/[handle]/[list].tsx` | public profile, follow, followers/following |
| `src/screens/edit-profile/*`, `src/app/edit-profile.tsx` | profile editor incl. avatar + topics + chapter |
| `src/screens/welcome/*`, `src/app/welcome.tsx` | post-join onboarding (guidelines → handle → topics → photo) |
| `src/screens/activity/*`, `.../activity.tsx`, `src/components/activity-bell.tsx` | notifications |
| `src/components/content-actions-menu.tsx`, `src/app/report.tsx`, `src/screens/report/*` | report/block UI |
| `src/screens/settings/blocked-group.tsx`, `delete-account-group.tsx` | blocked list, delete account |
| `src/screens/moderation/*`, `.../moderation.tsx` | admin report queue |
| `src/content/legal.ts` | + `guidelines` doc |

---

## API contract (both repos build against this)

All paths under `/api/v1`. Auth = existing Bearer/cookie/Supabase session. "Member" = `requireApiSession`. "Community member" = `requireCommunityMember` (session + not suspended + `termsAcceptedAt` set + `handle` set; else `forbidden` with message `"Finish your profile and accept the Community Guidelines first."`).

```ts
type TopicDTO = { slug: string; name: string; kind: "genre" | "community" };
type PersonSummaryDTO = {
  id: string; handle: string; name: string; avatarUrl: string | null;
  headline: string | null; isArtist: boolean; viewerFollows: boolean;
};
type PersonDTO = PersonSummaryDTO & {
  bio: string | null; location: string | null;
  chapter: { id: string; name: string } | null;
  topics: TopicDTO[]; followerCount: number; followingCount: number;
  communityPostCount: number; followsViewer: boolean; isSelf: boolean;
  artist: { handle: string; approved: boolean } | null; joinedAt: string;
};
type CommunityKind = "SHOUTOUT" | "COLLAB" | "SHOWING" | "ASK" | "KINDNESS" | "UPDATE";
type CommunityPostDTO = {
  id: string; kind: CommunityKind; body: string; imageUrl: string | null;
  topic: TopicDTO | null; parentId: string | null;
  author: { handle: string; name: string; avatarUrl: string | null; isArtist: boolean };
  supportCount: number; replyCount: number; viewerSupported: boolean;
  canDelete: boolean; createdAt: string;
};
type NotificationType = "FOLLOW" | "LIKE" | "COMMENT" | "REPLY" | "SUPPORT" | "MENTION";
type NotificationDTO = {
  id: string; type: NotificationType;
  actor: { handle: string; name: string; avatarUrl: string | null } | null;
  target: { kind: "post"; slug: string } | { kind: "community"; id: string } | { kind: "person"; handle: string } | null;
  preview: string | null; readAt: string | null; createdAt: string;
};
type ReportReason = "spam" | "harassment" | "hate" | "sexual" | "violence" | "self_harm" | "impersonation" | "other";
type ReportTargetType = "POST" | "COMMENT" | "COMMUNITY_POST" | "USER";
type ReportDTO = { id: string; targetType: ReportTargetType; targetId: string; reason: ReportReason;
  note: string | null; status: "OPEN" | "ACTIONED" | "DISMISSED"; reportCount: number;
  preview: string | null; reporter: { handle: string | null; name: string }; createdAt: string };
type Page<T> = { items: T[]; nextCursor: string | null };
```

| Method & path | Auth | Body / query | `data` |
|---|---|---|---|
| GET `/topics` | public | — | `TopicDTO[]` (active, `sortOrder` asc) |
| GET `/me` | member | — | existing shape; `user` gains `bio, headline, location, chapterId, topics: TopicDTO[], termsAcceptedAt: string\|null, suspended: boolean, followerCount, followingCount, unreadNotifications` |
| PATCH `/me` | member | any of `name, handle, bio, headline, location, chapterId(null ok), topicSlugs (≤8)` | same as GET `/me` |
| POST `/me/avatar` | member | multipart `file` (image ≤2.5 MB) | `{ avatarUrl: string }` |
| POST `/me/terms` | member | `{ accept: true }` | `{ termsAcceptedAt: string }` |
| DELETE `/me` | member | `{ confirm: "DELETE" }` | `{ deleted: true }` |
| GET `/people` | public (viewer optional) | `q?` (≥2 chars, name/handle contains, case-insensitive), `topic?`, `suggested=1?` (member only: shares ≥1 topic, not followed, not self, max 12), `cursor?`, `take?` (≤30) | `Page<PersonSummaryDTO>` |
| GET `/people/[handle]` | public | — | `PersonDTO` (404 if blocked either way or suspended) |
| POST `/people/[handle]/follow` | community member | — (toggle) | `{ following: boolean; followerCount: number }` |
| GET `/people/[handle]/followers` · `/following` | public | `cursor?, take?` | `Page<PersonSummaryDTO>` |
| GET `/people/[handle]/community` | public | `cursor?` | `Page<CommunityPostDTO>` (top-level only) |
| GET `/feed?kind=following` | member | `cursor?, take?` | existing feed page; `followingAvailable: true` |
| GET `/community` | public | `scope=all|following|foryou` (foryou = member only, ranked by your topics), `topic?`\|following`, `topic?`, `kind?`, `cursor?`, `take?` (≤30) | `Page<CommunityPostDTO>` top-level, newest first |
| POST `/community` | community member | `{ kind, body, topicSlug?, imageUrl?, parentId? }` | `CommunityPostDTO` (201) |
| POST `/community/media` | community member | multipart `file` (image only) | `{ url: string }` |
| GET `/community/[id]` | public | — | `{ post: CommunityPostDTO; replies: CommunityPostDTO[] }` (replies oldest first, ≤100) |
| DELETE `/community/[id]` | author or ADMIN | — | `{ deleted: true }` |
| POST `/community/[id]/support` | community member | — (toggle) | `{ supported: boolean; supportCount: number }` |
| GET `/notifications` | member | `cursor?` | `Page<NotificationDTO> & { unreadCount: number }` |
| POST `/notifications/read` | member | `{ ids?: string[] }` (omit = all) | `{ unreadCount: number }` |
| GET `/blocks` | member | — | `PersonSummaryDTO[]` |
| POST `/blocks` | member | `{ handle }` | `{ blocked: true }` (also removes follows both ways) |
| DELETE `/blocks/[handle]` | member | — | `{ blocked: false }` |
| POST `/reports` | member | `{ targetType, targetId, reason, note? (≤500) }` | `{ id: string }` (repeat report by same reporter → same id, 200) |
| GET `/admin/reports` | ADMIN | `status?` (default OPEN), `cursor?` | `Page<ReportDTO>` (grouped: one row per target, `reportCount`) |
| PATCH `/admin/reports/[id]` | ADMIN | `{ action: "hide" \| "dismiss" \| "suspend_user", reason?: string }` | `ReportDTO` |

Notification rules (W5): FOLLOW → followed user; LIKE → Wall post author; COMMENT → Wall post author; SUPPORT → community post author; REPLY → parent post author; MENTION → each `@handle` in a community body (max 5, existing non-blocked users). Never to self, never across a block, de-duplicate identical unread (same type+actor+target).

---

## Phase 1 — Backend (web repo, branch `feat/community-v1`) — **Sonnet**

### Task W0: Hide the prod E2E seed post — **Haiku** (separate branch `fix/hide-e2e-seed`)

**Files:** Modify `src/features/posts/denylist.ts`; Test `src/features/__tests__/denylist.test.ts` (create if absent).

- [ ] Write failing test: `isDeniedPostSlug("e2e-seed-post-20261007") === true`; `publicCatalogWhere().slug.notIn` contains it; `publicCatalogWhere().author.artistProfile.is.handle` equals `{ not: { startsWith: "e2eart" } }`.
- [ ] Add `"e2e-seed-post-20261007"` to `DENIED_POST_SLUGS`; add `export const TEST_HANDLE_PREFIX = "e2eart"` and make `publicCatalogWhere()` also add `artistProfile: { is: { approved: true, handle: { not: { startsWith: TEST_HANDLE_PREFIX } } } }`.
- [ ] `pnpm test` green; `tsc` green. Commit `fix(wall): hide E2E seed rows from public reads`. Push branch, open PR (do not merge).

### Task W1: Schema + migration

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20261015000000_community_v1/migration.sql`.

**Produces (Prisma models):**
- `User` += `handle String? @unique`, `bio String?`, `headline String?`, `location String?`, `chapterId String?`, `termsAcceptedAt DateTime?`, `suspendedAt DateTime?`, relations below.
- `Comment` += `hiddenAt DateTime?`.
- `enum CommunityKind { SHOUTOUT COLLAB SHOWING ASK KINDNESS UPDATE }`, `enum NotificationType { FOLLOW LIKE COMMENT REPLY SUPPORT MENTION }`, `enum ReportTargetType { POST COMMENT COMMUNITY_POST USER }`, `enum ReportStatus { OPEN ACTIONED DISMISSED }`.
- `Topic { id cuid; slug @unique; name; kind String @default("genre"); sortOrder Int @default(0); active Boolean @default(true); createdAt }`
- `UserTopic { userId; topicId; createdAt; @@id([userId, topicId]); @@index([topicId]) }` (cascade both)
- `Follow { followerId; followingId; createdAt; @@id([followerId, followingId]); @@index([followingId, createdAt]) }` (relations `"Follower"`/`"Following"`, cascade)
- `Block { blockerId; blockedId; createdAt; @@id([blockerId, blockedId]); @@index([blockedId]) }` (cascade)
- `CommunityPost { id cuid; authorId; kind CommunityKind; body String; imageUrl String?; topicId String?; parentId String?; hiddenAt DateTime?; createdAt; updatedAt; parent self-relation "Replies" onDelete Cascade; @@index([parentId, createdAt]); @@index([authorId, createdAt]); @@index([topicId, createdAt]); @@index([createdAt]) }` (author cascade, topic SetNull)
- `CommunityReaction { userId; postId; createdAt; @@id([userId, postId]); @@index([postId]) }` (cascade)
- `Notification { id cuid; userId; type NotificationType; actorId String?; targetKind String; targetRef String?; preview String?; readAt DateTime?; createdAt; @@index([userId, readAt, createdAt]) }` (user cascade; actor relation `"NotificationActor"` onDelete Cascade)
- `Report { id cuid; reporterId; targetType ReportTargetType; targetId; reason String; note String?; status ReportStatus @default(OPEN); resolvedById String?; resolvedAt DateTime?; createdAt; @@unique([reporterId, targetType, targetId]); @@index([status, createdAt]); @@index([targetType, targetId]) }` (reporter cascade)

- [ ] Edit schema; run `pnpm exec prisma validate` → "The schema ... is valid".
- [ ] Generate SQL without a DB: `pnpm exec prisma migrate diff --from-schema-datamodel <(git show main:prisma/schema.prisma) --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261015000000_community_v1/migration.sql` (on Windows write the old schema to a temp file first).
- [ ] Append to the SQL: `UPDATE "User" u SET "handle" = lower(ap."handle") FROM "ArtistProfile" ap WHERE ap."userId" = u."id" AND u."handle" IS NULL;` and the topic seed `INSERT INTO "Topic" ("id","slug","name","kind","sortOrder","active","createdAt") VALUES (gen_random_uuid()::text, …) ON CONFLICT ("slug") DO NOTHING;` for, in order: `visual-art` "Visual Artists", `music` "Musicians", `photo` "Photographers", `dance` "Dancers", `film` "Filmmakers", `stage` "Actors", `laugh` "Comedians", `frame` "Models" (kind `genre`), then `collabs` "Collabs", `gigs` "Gigs & Calls", `venues` "Venues & Spaces", `kindness` "Kindness" (kind `community`).
- [ ] Verify on a throwaway DB (Docker): `docker run -d --rm --name tap-pg-verify -e POSTGRES_PASSWORD=verify -p 55432:5432 postgres:16`; push the **old** schema (`prisma db push --schema <old>`), apply the new SQL with `prisma db execute --file … --url postgresql://postgres:verify@localhost:55432/postgres`, then `prisma migrate diff --from-url <same> --to-schema-datamodel prisma/schema.prisma --exit-code` → exit 0 (no drift). `docker stop tap-pg-verify`.
- [ ] `pnpm exec prisma generate`, `pnpm test`, `tsc` green. Commit `feat(db): community v1 schema (profiles, topics, follows, board, notifications, safety)`.

### Task W2: Profiles, topics, avatar, terms, account deletion

**Files:** Create `src/server/api/handles.ts`, `src/server/api/topics.ts`, `src/server/api/__tests__/profiles.test.ts`; Modify `src/server/api/meProfile.ts`, `src/features/auth/sessionUser.ts` (DTO fields), `src/app/api/v1/me/route.ts` (+DELETE); Create routes `topics/route.ts`, `me/avatar/route.ts`, `me/terms/route.ts`. Also: when an artist handle is created (`src/features/auth/register.ts`, `src/features/artists/inviteArtist.ts`), set `User.handle` to the same lowercased value.

**Produces:** `normalizeHandle(raw: string): string`; `isReservedHandle(h: string): boolean`; `handleSchema` (zod); `isHandleAvailable(prisma, handle, exceptUserId): Promise<boolean>` (checks `User.handle` and `ArtistProfile.handle` of other users, case-insensitive); `listTopics(prisma): Promise<TopicDTO[]>`; `patchMeProfile` (extended); `setAvatar(prisma, dbUser, file): Promise<{ok:true; avatarUrl}|{ok:false;code;message}>` (reuse `storeUploadedMedia`, reject video; writes `User.image` and `ArtistProfile.avatarUrl` when present); `acceptTerms(prisma, dbUser)`; `deleteAccount(prisma, dbUser, raw): Promise<{ok:true}|{ok:false;code;message}>`; `toMeDTO(prisma, dbUser)` used by GET/PATCH `/me`.

- [ ] Tests (vitest, mocked Prisma like `communityKernel.test.ts`): `PATCH /me` with `{handle:"Robbie_Art"}` stores `robbie_art`; `{handle:"admin"}` → 400 `fields.handle`; handle taken by another user's ArtistProfile → 409 `fields.handle`; `{topicSlugs:[9 slugs]}` → 400; unknown slug → 400; member (no ArtistProfile) can now set `bio` (old "Only artist accounts" conflict removed); `POST /me/avatar` with a video → 400; `DELETE /me` without `{confirm:"DELETE"}` → 400; with it → `prisma.user.delete` called once and audit `user.delete` meta contains `emailSha256` and **no** raw email; `GET /topics` returns active topics sorted.
- [ ] Implement; run `pnpm test` → PASS. Commit `feat(api): member profiles, topics, avatar, guidelines, account deletion`.

### Task W3: Follow graph, people directory, following feed

**Files:** Create `src/server/api/people.ts`, `src/server/api/__tests__/people.test.ts`; Modify `src/server/api/feed.ts`, `src/server/api/follow.ts` (flip `FOLLOWING_FEED_AVAILABLE = true`); Create routes `people/route.ts`, `people/[handle]/route.ts`, `people/[handle]/follow/route.ts`, `people/[handle]/followers/route.ts`, `people/[handle]/following/route.ts`, `people/[handle]/community/route.ts`.

**Consumes:** `blockedIdsFor(prisma, userId): Promise<Set<string>>` and `requireCommunityMember` from W6 — **implement those two in `src/server/api/safety.ts` first in this task** (W6 extends the file). `notify()` from W5 — call through an injected stub until W5 lands (export `notify` from `notifications.ts` as a no-op in this task).
**Produces:** `toPersonSummaryDTO(user, viewerFollows)`, `getPerson(prisma, handle, viewerId|null): Promise<PersonDTO|null>`, `searchPeople(prisma, query, viewerId|null): Promise<Page<PersonSummaryDTO>>`, `toggleFollow(prisma, viewer, handle)`, `listFollowers/listFollowing(prisma, handle, cursor, take, viewerId)`.

- [ ] Tests: follow toggles on/off and returns counts; following yourself → 400; following a user who blocked you → 404; `GET /people/[handle]` hides suspended/blocked → 404; `GET /people?q=a` → 400 (min 2 chars); `suggested=1` excludes self + already-followed and caps 12; `GET /feed?kind=following` without session → 401, with session returns only followed authors' public posts.
- [ ] Implement; tests PASS. Commit `feat(api): follows, people directory, following feed`.

### Task W4: Community board

**Files:** Create `src/server/api/textFilter.ts`, `src/server/api/community.ts`, `src/server/api/__tests__/community.test.ts`, `src/server/api/__tests__/textFilter.test.ts`; routes `community/route.ts`, `community/media/route.ts`, `community/[id]/route.ts`, `community/[id]/support/route.ts`.

**Produces:** `screenText(text: string): { ok: true } | { ok: false; message: string }` (blocklist in-file of slurs/explicit terms, case-insensitive whole-word; > 2 URLs rejected; message `"Let's keep it kind — please rephrase."`); `extractMentions(body: string): string[]` (`/(^|\s)@([a-z0-9_-]{2,40})/gi`, unique, max 5); `listCommunity`, `createCommunityPost`, `getCommunityThread`, `deleteCommunityPost`, `toggleSupport`.

- [ ] Tests: create requires community member (no terms → 403 with the exact message from the contract); body `""` / 501 chars → 400; blocked word → 400 with kind message; `imageUrl` not starting with `/uploads/` or the absolute site origin + `/uploads/` → 400; reply to a reply → 400 (`"Replies stay one level deep."`); reply to hidden/missing parent → 404; rate limit 10 posts / 10 min → 429; list excludes hidden + blocked authors + replies; detail returns replies oldest-first; delete by non-author non-admin → 403; support toggles and is idempotent per user; `extractMentions("hi @Robbie and @robbie @x")` → `["robbie"]`.
- [ ] Implement; tests PASS. Commit `feat(api): community board with kinds, replies, support, media`.

### Task W5: Notifications

**Files:** Create/replace `src/server/api/notifications.ts`, `src/server/api/__tests__/notifications.test.ts`; routes `notifications/route.ts`, `notifications/read/route.ts`; Modify `engagement.ts` (notify on like-on and comment), `people.ts` (FOLLOW on follow-on), `community.ts` (SUPPORT on support-on, REPLY, MENTION).

**Produces:** `notify(prisma, input: { userId: string; actorId: string; type: NotificationType; targetKind: "post"|"community"|"person"; targetRef: string|null; preview?: string|null }): Promise<void>` — never throws (logs), skips self and blocked pairs, skips if an identical unread row exists; `listNotifications`, `markRead`.

- [ ] Tests: self → no row; blocked pair → no row; duplicate unread → one row; list returns `unreadCount`; mark specific ids vs all; another user's ids are ignored; preview truncated to 120 chars.
- [ ] Implement; tests PASS. Commit `feat(api): in-app notifications`.

### Task W6: Safety — blocks, reports, moderation, filtering

**Files:** Modify `src/server/api/safety.ts`; Create `src/server/api/__tests__/safety.test.ts`; routes `blocks/route.ts`, `blocks/[handle]/route.ts`, `reports/route.ts`, `admin/reports/route.ts`, `admin/reports/[id]/route.ts`; Modify `engagement.ts` (comments list excludes `hiddenAt` and blocked authors when viewer signed in; `screenText` on comment create), `session.ts` (export `requireActiveMember` = session + not suspended, used by every existing write route: like, comment, studio posts/media, me PATCH — reads and `DELETE /me` stay allowed).

**Produces:** `blockedIdsFor`, `requireCommunityMember`, `requireActiveMember`, `blockUser`, `unblockUser`, `listBlocks`, `createReport`, `listReportsForAdmin`, `actOnReport`. Auto-hide: after `createReport`, if distinct OPEN reports for the target ≥ 3 → set `hiddenAt` (COMMENT / COMMUNITY_POST) or `Post.status = ARCHIVED` (POST) and audit `moderation.auto_hide`.

- [ ] Tests: block removes both follow edges; blocking self → 400; blocked author's comment disappears from the blocker's comment list; report self (USER) → 400; duplicate report returns same id; third distinct report hides a community post; non-admin `GET /admin/reports` → 403; `suspend_user` sets `suspendedAt` and the suspended user's `POST /community` and like → 403 while `DELETE /me` still works; `hide` on COMMENT sets `hiddenAt`.
- [ ] Implement; full `pnpm test` PASS. Commit `feat(api): block, report, moderation queue, suspensions`.

### Task W7: Public web profile + deletion page

**Files:** Create `src/app/u/[handle]/page.tsx` (server component: avatar, name, @handle, headline, bio, topics, chapter, counts, latest 10 community posts; `generateMetadata` with `robots: { index: false }` for non-artists; 404 on missing/suspended), `src/app/delete-account/page.tsx` (how to delete in-app + email `theartistpost` support address already in `src/content`), test `src/app/__tests__/deleteAccountPage.test.tsx` (renders heading "Delete your account").
- [ ] Implement with existing design-system components; `pnpm build` passes. Commit `feat(web): public profile page and account deletion info`.

### Task W8: Branch gate (Sonnet, then Opus review)
- [ ] `pnpm lint`, `pnpm test`, `pnpm exec next typegen && pnpm exec tsc --noEmit --incremental false`, `pnpm build` — paste outputs. Push branch, open PR "Community v1 — profiles, follows, board, notifications, safety" listing: requirement refs (this plan's D1–D11), migration file, **"DO NOT MERGE: needs pg_dump + migrate deploy GO"**, not-done list (DMs, push).

---

## Phase 2 — App (repo `theartistpost-app`)

### Task A1: API layer — **Haiku** (branch `feat/community-v1`, before any screen work)

**Files:** Modify `src/api/types.ts`, `src/api/hooks.ts`; Create `src/domain/people/handle.ts` + `handle.test.ts`, `src/domain/community/compose.ts` + `compose.test.ts`.

**Produces (hooks — exact names later tasks use):** `useTopics()`, `useMe()` (existing, type extended), `useUpdateProfile()`, `useUploadAvatar()`, `useAcceptTerms()`, `useDeleteAccount()`, `usePeople(params)`, `useSuggestedPeople()`, `usePerson(handle)`, `useToggleFollow(handle)` (optimistic on `usePerson` + `PersonSummaryDTO.viewerFollows` lists), `useFollowers(handle)`, `useFollowing(handle)`, `usePersonCommunity(handle)`, `useFollowingFeed()`, `useCommunity(params: { scope; topic?; kind? })`, `useCommunityThread(id)`, `useCreateCommunityPost()`, `useUploadCommunityImage()`, `useDeleteCommunityPost()`, `useToggleSupport(id)` (optimistic), `useNotifications()`, `useMarkNotificationsRead()`, `useBlocks()`, `useBlock()`, `useUnblock()`, `useReport()`, `useAdminReports(status)`, `useActOnReport()`. Query keys added to `queryKeys`. Domain: `validateHandle(raw): { ok: true; handle: string } | { ok: false; message: string }`, `COMMUNITY_KINDS: { id: CommunityKind; label: string; prompt: string }[]` (labels: "Shout-out", "Collab call", "I'm showing", "Ask the house", "Kindness", "Studio update"), `COMMUNITY_BODY_MAX = 500`, `extractMentions(body)` (same rule as server).

- [ ] Jest tests first for `validateHandle` (reserved, length, chars, lowercasing) and `extractMentions` (same cases as W4); run `npm test` → FAIL; implement → PASS.
- [ ] Types + hooks exactly per contract; mutations invalidate the right keys (follow → person, people lists, following feed; post → community lists + thread; support → thread + lists; block → everything people/community/comments; report → nothing). `npm run typecheck`, `npm run lint`, `npm test` green. Commit `feat(api): community v1 client types and hooks`.

### Task A2: Tabs, Community board, composer, thread — **Sonnet**

**Files:** Rename `src/app/(tabs)/(home,wall,schedule,kindness,studio)` → `(home,wall,community,schedule,studio)` (keep every screen file, incl. `kindness.tsx`); Modify `src/app/(tabs)/_layout.tsx` (triggers: Home, The Wall, Community [`sf: bubble.left.and.text.bubble.right`, md `forum`], Schedule, You [label "You"]); Create `.../community.tsx`, `.../community/[id].tsx`, `src/app/compose-community.tsx` (formSheet), `src/screens/community/{index,community-card,kind-chip,thread,reply-bar,kindness-card,empty-board}.tsx`, `src/screens/compose-community/index.tsx`.

- [ ] Board: segmented All / Following (Following requires sign-in → join prompt), horizontal topic chips (`useTopics`), kind filter, FlashList of `community-card` (avatar → person profile, kind chip, body with tappable `@mentions`, image via expo-image, Support button with haptic + count, reply count, overflow slot `renderActions` for A6's menu), a pinned `kindness-card` linking to the existing kindness wall screen, honest empty state "The board is quiet. Be the first to lift someone up." Pull to refresh, infinite scroll.
- [ ] Composer: kind picker (chips from `COMMUNITY_KINDS`, each with its prompt as placeholder), body with live counter (500), optional topic, optional photo (expo-image-picker library only → expo-image-manipulator resize 1600px JPEG 0.8 → `useUploadCommunityImage`), Post button disabled until valid; if the user lacks handle/terms → route to `/welcome`.
- [ ] Thread: original post + replies + reply bar (one level), delete own.
- [ ] Verify on Android emulator (argent) — board renders empty state against prod API; typecheck/lint/test green. Commit `feat(community): board, composer, threads, five-tab layout`.

### Task A3: Profiles — **Sonnet**

**Files:** Create `.../person/[handle].tsx`, `.../people/[handle]/[list].tsx` (`list` ∈ followers|following), `src/app/edit-profile.tsx` (formSheet), `src/app/welcome.tsx` (fullScreenModal), `src/screens/person/{index,profile-header,follow-button,stat-row,topic-pills}.tsx`, `src/screens/edit-profile/{index,avatar-picker,topic-picker,chapter-picker}.tsx`, `src/screens/welcome/index.tsx`; Modify `src/screens/studio/index.tsx` (top: own profile header from `profile-header` with Edit + Share profile `https://theartistpost.fluxlab.agency/u/<handle>` via `Share`), `src/screens/artist/index.tsx` (Follow button + "Community profile" link), `src/screens/join/index.tsx` (after successful join → `router.replace("/welcome")`).

- [ ] Person screen: header (large avatar, name, @handle, artist badge if approved, headline, location · chapter), stats (followers / following / posts → list screens), topic pills, bio, Follow/Following button (optimistic), their community posts list, overflow slot for A6's menu. Self → "Edit profile" instead of Follow.
- [ ] Edit profile: avatar (picker → square crop → 1024px JPEG 0.8 → `useUploadAvatar`), name, handle (live `validateHandle`, server conflict shown inline), headline, location, bio counter 480, chapter picker (`src/content/chapters.ts`, plus "No chapter"), topics multi-select ≤ 8.
- [ ] Welcome (shown when `me.user.handle == null || termsAcceptedAt == null`): step 1 Community Guidelines (from `legalDocs.guidelines`, Accept button → `useAcceptTerms`), step 2 name + handle, step 3 topics, step 4 photo (skippable). Finish → Community tab.
- [ ] Emulator walk-through: join → welcome → profile visible in You tab. Gates green. Commit `feat(profiles): person pages, follow, edit profile, onboarding`.

### Task A4: Activity — **Haiku** (worktree branch `feat/community-safety`, based on A1's commit)

**Files:** Create `.../activity.tsx`, `src/screens/activity/{index,notification-row}.tsx`, `src/components/activity-bell.tsx` (bell icon + unread badge from `useMe().data.user.unreadNotifications`; renders nothing when signed out).
- [ ] Rows: actor avatar + sentence per type ("{name} followed you", "{name} supported your post", "{name} replied: “{preview}”", "{name} mentioned you", "{name} liked {preview}", "{name} commented: “{preview}”"), unread dot, tap → target route (post → `/post/[slug]`, community → `/community/[id]`, person → `/person/[handle]`). Mark all read on screen focus. Empty state "Nothing yet — follow a few artists to get the house talking."
- [ ] Gates green. Commit `feat(activity): notifications screen and bell`.

### Task A5: Safety UI — **Haiku** (same worktree branch)

**Files:** Create `src/components/content-actions-menu.tsx` (`<ContentActionsMenu target={{ type: ReportTargetType; id: string }} authorHandle?: string isOwn?: boolean onDelete? />` — ellipsis button opening native menu: Report…, Block @handle (confirm), Delete (own only)), `src/app/report.tsx` (formSheet with `type` & `id` params), `src/screens/report/index.tsx` (reason radio list from `ReportReason`, optional note ≤500, submit → "Thanks — the house team reviews reports within 24 hours."), `src/screens/settings/blocked-group.tsx`, `src/screens/settings/delete-account-group.tsx` (type DELETE to confirm → `useDeleteAccount` → sign out → clear query cache → Home), `src/screens/moderation/index.tsx` + `.../moderation.tsx` (ADMIN only: OPEN reports with preview + count; Hide / Dismiss / Suspend with confirm); Modify `src/content/legal.ts` (add `guidelines` LegalDocId: Be kind; Lift others up; No harassment/hate/sexual content/spam; Respect artists' work and credit; Report don't retaliate; We review reports within 24 hours and may remove content or suspend accounts; Artists are never charged to take part), `src/screens/settings/index.tsx` (mount the two groups + Moderation row when `permissions.admin`), `src/screens/post/comment-list.tsx` and `src/screens/post/index.tsx` (mount `ContentActionsMenu` for each comment and the post).
- [ ] Gates green. Commit `feat(safety): report, block, delete account, moderation queue, guidelines`.

### Task A6: Integrate + polish — **Sonnet** (after A4/A5 merged into `feat/community-v1` by Opus)
- [ ] Place `ActivityBell` in Home and Community headers; place `ContentActionsMenu` in `community-card`, thread replies and person header (`USER` target).
- [ ] Accessibility pass: every touchable has `accessibilityLabel`/role, 44pt targets, Dynamic Type at largest size does not clip cards.
- [ ] Full gates + `npx expo-doctor`. Emulator script: join (test email) → welcome → edit profile with photo → follow an artist → post a Shout-out mentioning them → support → reply → activity shows nothing for self → report a post → block → blocked content gone → delete account. Commit `feat(community): wire activity and safety into screens`.

## Phase 3 — Ship (Opus + Jonathan's GO)

1. Opus reviews both PRs end-to-end (security focus on W2/W6), runs `/code-review`-level pass.
2. **GO BOARD (Jonathan):** (a) VPS `pg_dump` backup, (b) `prisma migrate deploy` on prod (or `db execute` of the one SQL file + `migrate resolve --applied`), (c) merge web PR → live in ~3 min, (d) verify `/api/v1/topics` live.
3. App: merge app PR (own repo), `eas build --profile production --platform ios` under Flux Labs Agency LLC team with the existing dev bundle id `agency.fluxlab.theartistpost.dev`, submit to **TestFlight internal** — age rating re-answered with UGC = yes. External TestFlight / App Store under TAP's own Apple account when Apple approves it (bundle `org.theartistpost.app`).
4. Robbi: confirm topics list, guidelines copy, and who answers reports within 24h (D10). Log all decisions to Flux Mind under The Artist Post.

## Decision log (open — ask Robbi/Jonathan, defaults applied)
1. Topic list (default: 8 genres + 4 community topics above).
2. Report responder within 24h (default: Robbi + Jonathan as ADMINs).
3. Community open to all members vs artists-only (default: all members who accept guidelines).
4. DMs in v1.1 with mutual-follow rule (default yes).
5. Push notifications v1.1 (needs GO; contact tripwire).
