# Web Sign-in and Users (App Parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A person signed in on theartistpost.org gets the same account the app gives them: a visible account entry, their own profile, profile editing with avatar, follow, followers/following, self-serve deletion, then (Phases 2–3) community, activity, RSVPs and admin, all reading and writing the same data the app does.

**Architecture:** No new backend. Every write goes through the existing `/api/v1/*` routes the Expo app already calls; the browser's `tap_session` cookie already authenticates them (`resolveRequestAuth` falls back to the cookie when there is no Bearer). Reads in server components call the same `src/server/api/*` functions those routes use, passing the cookie viewer, the pattern `/u/[handle]` already follows. Because both clients hit one API and one database, web and app stay in sync with zero sync code.

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`), React 19, Tailwind 4, Prisma 6 on VPS Postgres, zod, vitest, lucide-react.

**Spec:** Jonathan, 2026-10-18: "Plan out implementing sign in and users like the app does into the website." Source of truth for behavior = the Expo app (`fluxopss/theartistpost-app`, screens under `src/screens/*`, API calls in `src/api/hooks.ts`). Repo: `fluxopss/theartistpost` (web), base `main` @ `bb813f9` (pull first; local clones may be at `61a6abf`).

## Global Constraints

- Web repo only. Do not change any `/api/v1` request or response shape: installed app builds depend on them.
- Never redirect `/api`, `/uploads`, `/_next`, `/.well-known` (see `src/shared/lib/canonicalHost.ts`). theartistpost.fluxlab.agency/api stays alive permanently.
- Every API call from the browser: `fetch("/api/v1/...", { credentials: "same-origin" })`, relative URL, JSON envelope `{ ok: true, data } | { ok: false, error: { code, message, fields?, retryAfterSec? } }` (`src/server/api/respond.ts`).
- Sign-in stays passwordless (email code). No passwords, no new auth provider, no tokens in `localStorage`.
- Profile field limits come from `src/server/api/meProfile.ts` constants, never re-typed: `BIO_MAX` 480, `HEADLINE_MAX` 80, `LOCATION_MAX` 60, `TOPICS_MAX` 8, name 2–80.
- Personalized HTML is never publicly cached: any page that reads the session is `export const dynamic = "force-dynamic"`.
- App Review accounts (`APP_REVIEW_HANDLE_PREFIX` "appreview-") stay out of every listing a task adds.
- Copy: warm, plain, positive; no "Expo Go", no tester language on public pages.
- Gates: each PR runs `pnpm test`, `pnpm lint` (no new errors), `pnpm exec tsc --noEmit`, `pnpm build` (`next build --webpack`). Merging to `main` auto-deploys to production, so **merge waits for Jonathan's word**. Byte-verify every push (re-clone + diff).

## Review Focus

1. **Open redirect through `next`** — `//evil.com`, `/\evil.com`, `https://evil.com`, `%2F%2Fevil.com`, `/join?next=/join` must all fall back to `/`. Pinned in Task 2.
2. **Cross-site write riding the cookie** — a POST/PATCH/DELETE carrying `tap_session` with `Origin: https://evil.example` must get 401; the app (Bearer, no Origin) and same-origin pages on either host must keep working. Pinned in Task 1.
3. **Session expires mid-edit** — a 401 on save must keep the person's unsaved profile edits and bring them back after they sign in again (the app does this). Pinned in Tasks 3 and 5.
4. **Signed-in person without a handle, or suspended** — no `/u/undefined` links; a suspended person sees a calm "account paused" note on edit, and can still delete their account. Pinned in Tasks 4, 5 and 7.
5. **Rate-limited follow (429) or double-click** — the button reverts to the server's truth and shows "Try again in a moment", never a count that drifts from the server. Pinned in Task 6.

---

## Phase 1 — Account foundation (ship before Fri 10/30)

### Task 1: Same-origin guard for cookie-authenticated writes

**Files:**
- Create: `src/features/auth/sameOrigin.ts`
- Modify: `src/features/auth/requestSession.ts` (cookie branch, ~line 69)
- Test: `src/features/auth/__tests__/sameOrigin.test.ts`

**Interfaces:**
- Produces: `isSameOriginWrite(input: { method: string; origin: string | null; referer: string | null; host: string | null }, env: { canonicalHost?: string; legacyHosts?: string }): boolean`

SameSite=lax already blocks most cross-site cookie POSTs; this is defense in depth now that the browser becomes a full API client.

- [ ] **Step 1: Write the failing tests**

```ts
const env = { canonicalHost: "theartistpost.org", legacyHosts: "theartistpost.fluxlab.agency" };
const w = (o: Partial<Parameters<typeof isSameOriginWrite>[0]>) =>
  isSameOriginWrite({ method: "POST", origin: null, referer: null, host: "theartistpost.org", ...o }, env);

it("always allows GET and HEAD", () => { expect(w({ method: "GET", origin: "https://evil.example" })).toBe(true); });
it("allows writes from the canonical, legacy and request host", () => {
  expect(w({ origin: "https://theartistpost.org" })).toBe(true);
  expect(w({ origin: "https://theartistpost.fluxlab.agency" })).toBe(true);
  expect(w({ origin: "http://localhost:3013", host: "localhost:3013" })).toBe(true);
});
it("rejects a foreign Origin", () => { expect(w({ origin: "https://evil.example" })).toBe(false); });
it("falls back to Referer when Origin is missing", () => {
  expect(w({ referer: "https://theartistpost.org/settings" })).toBe(true);
  expect(w({ referer: "https://evil.example/x" })).toBe(false);
});
it("rejects a cookie write with neither Origin nor Referer", () => { expect(w({})).toBe(false); });
it("rejects Origin: null", () => { expect(w({ origin: "null" })).toBe(false); });
```

Plus one integration test in `requestSession` tests: cookie session + `Origin: https://evil.example` + `PATCH` → `{ kind: "none" }`; Bearer token + no Origin + `PATCH` → `{ kind: "hmac" }` (app unaffected).

- [ ] **Step 2: Run** `pnpm vitest run src/features/auth/__tests__/sameOrigin.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `isSameOriginWrite` (compare `new URL(origin).host`, lowercased, against canonical + legacy list + request host; reuse `normalizeHost` semantics from `canonicalHost.ts` by exporting it). In `resolveRequestAuth`, only in the cookie branch: if `!isSameOriginWrite(...)` return `{ kind: "none" }` and `console.warn("[auth] cross-origin cookie write refused", { method, originHost })` (host only, never the cookie).
- [ ] **Step 4: Run** the auth test folder → PASS; full `pnpm test` → PASS.
- [ ] **Step 5: Commit** `feat(auth): refuse cross-origin writes that ride the session cookie`

### Task 2: Safe return path and `requireViewer`

**Files:**
- Create: `src/shared/lib/safeNext.ts`, `src/features/auth/requireViewer.ts`
- Modify: `src/app/join/page.tsx`, `src/features/auth/JoinExperience.tsx` (success paths at ~lines 104, 124, 163)
- Test: `src/shared/lib/__tests__/safeNext.test.ts`, `src/features/auth/__tests__/requireViewer.test.ts`

**Interfaces:**
- Produces: `safeNextPath(raw: string | null | undefined): string | null` — returns a same-site path or null.
- Produces: `joinHref(nextPath: string): string` → `/join?door=return&next=<encoded>`
- Produces: `requireViewer(nextPath: string): Promise<SessionUser>` — server-only; `redirect(joinHref(nextPath))` when signed out.
- Produces: `JoinExperience` prop `nextPath?: string | null`.

- [ ] **Step 1: Write the failing tests**

```ts
it.each([["/settings/profile", "/settings/profile"], ["/u/robbi?tab=posts", "/u/robbi?tab=posts"]])("keeps %s", (i, o) => expect(safeNextPath(i)).toBe(o));
it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "%2F%2Fevil.com", "/join", "/join?door=return", "/api/v1/me", "", null, "x".repeat(513)])
  ("refuses %s", (i) => expect(safeNextPath(i as string)).toBeNull());
it("encodes next in joinHref", () => expect(joinHref("/u/a?b=1")).toBe("/join?door=return&next=%2Fu%2Fa%3Fb%3D1"));
```

`requireViewer`: mock `getSession` → null ⇒ `redirect` called with `/join?door=return&next=%2Fsettings%2Fprofile`; session present ⇒ returns the user.

- [ ] **Step 2: Run** both test files → FAIL.
- [ ] **Step 3: Implement.** `safeNextPath` decodes once, requires a leading single `/`, rejects `\`, control chars, any `:` before the first `/`, length > 512, and paths starting `/join` or `/api`. `join/page.tsx` reads `next`: if a session already exists and `next` is safe, `redirect(next)`; otherwise pass `nextPath` to `JoinExperience`, which on every success does `router.replace(nextPath ?? <current destination>)` then `router.refresh()`.
- [ ] **Step 4: Run** tests → PASS. Manual: signed out, open `/join?door=return&next=/settings`, sign in with a code → lands on `/settings`.
- [ ] **Step 5: Commit** `feat(auth): return to the page you came from after sign-in`

### Task 3: `webApi` browser client

**Files:**
- Create: `src/features/account/webApi.ts`
- Test: `src/features/account/__tests__/webApi.test.ts`

**Interfaces:**
- Consumes: `joinHref` (Task 2).
- Produces:
  - `type WebApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: { code: string; message: string; fields?: Record<string, string>; retryAfterSec?: number } }`
  - `webApi<T>(path: `/${string}`, init?: { method?: "GET"|"POST"|"PATCH"|"DELETE"; json?: unknown; form?: FormData; onUnauthorized?: "redirect" | "return" }): Promise<WebApiResult<T>>`

- [ ] **Step 1: Write the failing tests** (mock `fetch`, `window.location.assign`)

```ts
it("calls /api/v1 relative with same-origin credentials and JSON", async () => { await webApi("/me", { method: "PATCH", json: { name: "Rae" } });
  expect(fetch).toHaveBeenCalledWith("/api/v1/me", expect.objectContaining({ method: "PATCH", credentials: "same-origin", headers: expect.objectContaining({ "Content-Type": "application/json" }), body: '{"name":"Rae"}' })); });
it("sends FormData without a Content-Type header", ...);
it("unwraps { ok:true, data }", ...);
it("returns the error envelope and status on 4xx", ...);
it("on 401 redirects to joinHref(current path) by default", async () => { /* location.pathname "/settings/profile" */ expect(window.location.assign).toHaveBeenCalledWith("/join?door=return&next=%2Fsettings%2Fprofile"); });
it("on 401 with onUnauthorized:'return' does not redirect", ...);
it("maps a network failure to { ok:false, status:0, error.code:'network' }", ...);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(account): typed same-origin client for /api/v1`

### Task 4: Account entry in the header and mobile drawer

**Files:**
- Create: `src/features/account/AccountMenu.tsx`, `src/features/account/accountLinks.ts`
- Modify: `src/components/NavBar.tsx` (desktop actions cluster ~line 88; mobile drawer ~line 123)
- Test: `src/features/account/__tests__/accountLinks.test.ts`, `src/features/account/__tests__/AccountMenu.test.tsx`

**Interfaces:**
- Consumes: `useSession()` from `AuthProvider`; `joinHref` (Task 2).
- Produces: `accountLinks(user: SessionUser | null, pathname: string): Array<{ href: string; label: string }>`

- [ ] **Step 1: Write the failing tests**

```ts
expect(accountLinks(null, "/u/rae")).toEqual([{ href: "/join?door=return&next=%2Fu%2Frae", label: "Sign in" }, { href: "/join", label: "Join" }]);
expect(accountLinks(null, "/join")[0].href).toBe("/join?door=return"); // no next back to /join
expect(accountLinks({ ...viewer, handle: "rae" }, "/").map(l => l.label)).toEqual(["Your profile", "Edit profile", "Settings"]);
expect(accountLinks({ ...viewer, handle: undefined }, "/").map(l => l.href)).not.toContain("/u/undefined");
expect(accountLinks({ ...viewer, role: "ARTIST", handle: "rae" }, "/").map(l => l.label)).toContain("Your studio"); // href "/create"
```

`AccountMenu`: signed out renders the `accountLinks` entries; signed in renders a button with the avatar image or initials (`aria-haspopup="menu"`, `aria-expanded`), opens the links plus a "Sign out" button wired to `useSession().signOut`; Escape and outside click close it.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `AccountMenu` (lucide `UserRound` fallback icon, 40px target to match the existing menu button) and place it left of the theme toggle on desktop and as a section at the top of the mobile drawer.
- [ ] **Step 4: Run** tests → PASS; `pnpm build` → PASS. Check at 375px and 1280px, light and dark, that nothing overflows the nav.
- [ ] **Step 5: Commit** `feat(account): account menu in the header and drawer`

### Task 5: Edit profile page

**Files:**
- Create: `src/app/settings/profile/page.tsx`, `src/features/account/EditProfileForm.tsx`, `src/features/account/profileDraft.ts`
- Modify: `src/features/app/SettingsPanel.tsx` (add "Edit your profile" link at the top of the Session section)
- Test: `src/features/account/__tests__/profileDraft.test.ts`, `src/features/account/__tests__/EditProfileForm.test.tsx`

**Interfaces:**
- Consumes: `requireViewer` (Task 2), `webApi` (Task 3), `toMeDTO(prisma, dbUser)` and `MeDTO` and the `*_MAX` constants from `src/server/api/meProfile.ts`, `listTopics(prisma)` from `src/server/api/topics.ts`, chapters from `src/lib/content/chapters.seed.ts`.
- Produces: page `/settings/profile` (`dynamic = "force-dynamic"`, `robots: noindex`). `profileDraft`: `saveDraft(userId: string, draft: ProfileDraft): void`, `loadDraft(userId: string): ProfileDraft | null`, `clearDraft(userId: string): void` — `localStorage` key `tap:profile-draft:<userId>`, every access in try/catch.

Fields, exactly what `mePatchSchema` accepts: `name`, `headline`, `bio`, `location`, `chapterId` (picker: "No chapter" + chapters), `topicSlugs` (toggle chips, max `TOPICS_MAX`), and for approved artists only (`me.profile?.approved`) `venmoUsername`, `cashAppTag`, `paypalMeUsername`. Avatar: file input (`accept="image/*"`) → `POST /api/v1/me/avatar` with `FormData` field `file` → response `{ avatarUrl }`; preview immediately, then `router.refresh()` so the header avatar updates.

- [ ] **Step 1: Write the failing tests**

```ts
it("sends only changed fields in the PATCH", ...); // edit headline only → body { headline: "..." }
it("shows server field errors next to the field", ...); // { ok:false, error:{ fields:{ bio:"Too long" } } }
it("saves a draft when save fails or returns 401, restores it on next load with a notice", ...);
it("clears the draft after a successful save", ...);
it("disables topic chips past TOPICS_MAX", ...);
it("hides payment usernames unless the profile is an approved artist", ...);
it("shows the paused note and disables Save when me.user.suspended", ...);
it("profileDraft survives a throwing localStorage", ...);
```

Server page loads `MeDTO` directly with Prisma (no self-fetch); signed out → `requireViewer("/settings/profile")`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Success toast "Saved. Your profile is updated on the app too." **Step 4: Run** → PASS; manual: change headline on web, pull to refresh in the app, see it.
- [ ] **Step 5: Commit** `feat(account): edit profile and photo on the web`

### Task 6: Viewer-aware profiles, Follow, followers and following

**Files:**
- Modify: `src/app/u/[handle]/page.tsx` (line 18 passes `null` as viewer today)
- Create: `src/features/people/FollowButton.tsx`, `src/app/u/[handle]/followers/page.tsx`, `src/app/u/[handle]/following/page.tsx`, `src/features/people/FollowList.tsx`
- Test: `src/features/people/__tests__/FollowButton.test.tsx`, `src/app/u/[handle]/__tests__/followLists.test.ts`

**Interfaces:**
- Consumes: `getPerson(prisma, handle, viewerId)` — `PersonDTO` already carries `viewerFollows` (viewer → person, what the app's FollowButton uses), `followsViewer` (person → viewer, shows "Follows you"), `isSelf`, `followerCount`, `followingCount`; `listFollowers` / `listFollowing(prisma, handle, page: PageParams, viewerId)`; `webApi` (Task 3); `joinHref` (Task 2).
- Produces: `<FollowButton handle={string} initialFollowing={boolean} initialCount={number} signedIn={boolean} />`. Follow call: `POST /api/v1/people/<handle>/follow` → `{ following: boolean, followerCount: number }` (it toggles). No API change.

- [ ] **Step 1: Write the failing tests**

```ts
it("signed out: clicking Follow goes to joinHref('/u/rae')", ...);
it("optimistically flips, then adopts the server's following + followerCount", ...);
it("on 429 reverts and shows 'Try again in a moment'", ...);
it("ignores clicks while a request is in flight", ...);
it("isSelf renders 'Edit profile' (href /settings/profile) instead of Follow", ...);
it("follower list paginates with ?cursor= and excludes appreview- handles", ...);
it("signed-in page passes the viewer id, so viewerFollows and a 'Follows you' pill render", ...);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Page reads session via `getSession()`, passes `session?.user.id ?? null`. Counts link to the list pages. Lists: 30 per page, "Show more" via `?cursor=`.
- [ ] **Step 4: Run** → PASS; manual: follow on web, see it on the app's profile.
- [ ] **Step 5: Commit** `feat(people): follow and followers on the web, same graph as the app`

### Task 7: Self-serve account deletion on the web

**Files:**
- Create: `src/features/account/DeleteAccountForm.tsx`
- Modify: `src/features/app/SettingsPanel.tsx` (~line 199, replace the `mailto:` link when signed in), `src/app/delete-account/page.tsx` (signed in → show the form; signed out → keep current instructions plus "Sign in to delete it yourself" via `joinHref("/delete-account")`)
- Test: `src/features/account/__tests__/DeleteAccountForm.test.tsx`

**Interfaces:**
- Consumes: `webApi` (Task 3), `useSession().signOut`.
- Calls `DELETE /api/v1/me` with `{ confirm: "DELETE" }` (allowed while suspended).

- [ ] **Step 1: Failing tests:** button disabled until the input is exactly `DELETE`; success → `signOut()` then `router.replace("/?deleted=1")`; error shows the server message and keeps the person signed in.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (red-tone button, plain copy: "This removes your profile, posts and follows for good."). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(account): delete your account from the web`

### Task 8: Launch cleanup

**Files:**
- Modify: `src/features/app/StudioHub.tsx` (remove the `/setup-expo` "Setup latest Expo Go" item), `src/app/globals.css` (remove the dead `html.cursor-trail-active` rule), `deploy/traefik-theartistpost.yml` (sync to the live VPS file: `tls.domains` main `theartistpost.org`, sans `www.theartistpost.org`)
- Test: extend `src/components/__tests__/CursorTrail.test.tsx` is unchanged; add `expect(screen.queryByText(/Expo Go/i)).toBeNull()` to the StudioHub test (create if missing).

- [ ] **Step 1–4:** failing assertion → remove → PASS → `pnpm build` PASS.
- [ ] **Step 5: Commit** `chore(launch): drop tester link, dead cursor rule; sync Traefik file`

**Phase 1 done means:** on theartistpost.org, a person can sign in from any page and land back on it, see themselves in the header, edit name/headline/bio/location/chapter/topics/photo (and payment usernames if an approved artist), follow people and see the lists, delete their account, and every change shows up in the app. Verified live with one real sign-in by Jonathan (he receives the code; Claude never handles it).

---

## Phase 2 — Community parity (outline; detail when Phase 1 merges)

Each item = one task, same pattern (server read + `webApi` write), mapped to the app screen it mirrors:

| Web page | App screen | API |
|---|---|---|
| `/community` feed + `/community/[id]` | tabs/community, community/[id] | `GET /community`, `GET /community/[id]` |
| Compose with photos | compose-community | `POST /community/media` (multipart) then `POST /community` |
| Reactions + "support" | reactors, community actions | `/community/[id]/reaction(s)`, `/community/[id]/support` |
| People directory, search, suggested | tabs/wall, people/[handle]/[list] | `GET /people?q=&topic=&suggested=1` |
| Activity + unread badge in AccountMenu | activity | `GET /notifications`, `POST /notifications/read`; badge from `MeDTO.user.unreadNotifications` |
| Report + block on posts and profiles | report, settings blocks | `POST /reports`, `POST/DELETE /blocks` |
| Terms gate before first post | welcome | `POST /me/terms` when `termsAcceptedAt` is null |

## Phase 3 — Nights and admin (outline)

| Web page | App screen | API |
|---|---|---|
| RSVP on `/event/[id]` and `/night` | rsvp, night | `POST /events/[id]/rsvp`, `POST /night/rsvp` |
| `/me/nights` | my-nights | `GET /me/rsvps` |
| `/admin` (ADMIN only, `requireViewer` + role check, noindex) | moderation, artist-requests, manage-people, manage-events | `/admin/reports`, `/admin/users`, `/admin/events`, `/admin/events/media` |

Admin on web is the "above and beyond" piece for Robbie: he can approve artists and moderate from a laptop.

## Risks and how the plan handles them

- **Sign-in email volume:** Resend free tier is 100 emails/day. Web sign-in will raise volume. Upgrade before launch day is Jonathan's call (money).
- **CSRF:** Task 1 plus existing SameSite=lax.
- **Stale personalized pages:** force-dynamic on every session page; `router.refresh()` after writes.
- **App breakage:** zero `/api/v1` shape changes. The only server-side change is Task 1's Origin check, which never touches Bearer (app) requests.

## Execution handoff

Each phase = one branch and PR off `main`, all gates green, byte-verified, merged only on Jonathan's word (merge = production deploy). Hand-off option for Cursor: `TO-Cursor-web-sign-in-users-2026-10-18.md` with Phase 1 acceptance = the "Phase 1 done means" paragraph above.
