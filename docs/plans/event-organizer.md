# Event Organizer (free opportunities by local artists)

Status: DRAFT plan for review. No feature code in this PR.
Ask (Robbie, Nov 10-11): local artists are starting to create their own events; launch the Event Organizer part soon so they can create their own free opportunities for creatives on the site.

## 1. What exists today

Read from `main` at 25790e2.

**Roles.** `enum Role { VIEWER, ARTIST, ADMIN }`. `ArtistProfile.approved` (default false) is the second gate. `User.suspendedAt` makes an account read-only.

**Write gate.** `authorizePublisher` (`src/features/auth/publishGate.ts`) allows a real session that is ARTIST or ADMIN, not suspended, and (for ARTIST) has an approved profile. Mock guest and denylisted emails always fail. API wrappers live in `src/server/api/session.ts`: `requireApiSession`, `requireActiveMember` (not suspended), `requireAdmin`, plus the studio publisher gate.

**Events ("nights").** `Event` model: title, description, `medium` (the "lane", a free string like music or culinary), `startsAt`/`endsAt` + `timeZone`, `venueName`/`venueAddress`/lat/lng, `capacity`, `status` (DRAFT, PUBLISHED, CANCELLED), `coverImageUrl`, `comingSoon`, `sponsorName/Url/LogoUrl` ("Presented by"), `vendors` (json, max 12), `createdById`, `publishedAt`, `cancelledAt`. Related: `EventRsvp` (GOING/MAYBE/NOT_GOING, party size, waitlist) and `EventCheckIn`.

**Event admin.** Admin only, API only (no web admin page exists today; the admin event form is in the mobile app): `GET/POST /api/v1/admin/events`, `/admin/events/[id]` (edit), `/publish`, `/cancel`, `/duplicate`, `/rsvps`, `/checkins`, `/admin/events/media`. Validation lives in `src/server/api/eventAdmin.ts` (zod). Sponsor and vendor fields are admin-set only on purpose ("no money field: artists and vendors never pay").

**Public reads.** `GET /api/v1/events` (optional `?lane=`), `/api/v1/events/[id]`, web `/night`, `/event/[id]`, `/artist-schedule`. Managed rows win over the content-service seed entries.

**Programs and involvement.** `/programs`, `/get-involved` (five "doors" in `src/content/involve.ts`: space, partner, support, volunteer, events). Doors collect an inquiry through `POST /api/involve` into GHL (lead webhook), not into our database. Free showcase booking today is "review the agreement, get approved, receive a scheduling link". PR #54 (draft) adds daily sign-up blocks; this plan does not touch it.

**Moderation.** `Report` (target POST, COMMENT, COMMUNITY_POST, USER; OPEN/ACTIONED/DISMISSED; one per reporter per target; rate limited), admin queue at `/api/v1/admin/reports`, `Block`, `AuditLog`, `User.suspendedAt`, and `textFilter.ts` (blocked terms, max 2 links, "keep it kind" message) used on community text. There is no EVENT report target yet.

**Limits found.** Artists cannot create events at all. Event copy has no text filter. Reports cannot point at an event. `/get-involved` events door is an inquiry form, so nothing an artist submits becomes a listing.

## 2. Smallest version that works

An approved artist (and admins) can submit a **free** opportunity or event. It lands as `PENDING_REVIEW`. An admin approves it (it becomes public) or sends it back with a short note. Nothing an artist submits is public until an admin says yes.

Why reuse `Event` instead of a new table: the listing, RSVP, check-in, lane filter, calendar and app already read `Event`. Submitting is a new door into the same table, so the website and app show organizer events with no new reader code.

Recommendation: **no new role in Phase 1.** Use ARTIST + approved profile (the existing gate). Add an `organizerApprovedAt` flag on the user only if Robbie wants organizing to be a separate permission from performing (open question 1). A role enum change is the costlier, less reversible route; a nullable flag is additive.

Free only in Phase 1: no price, ticket or payment fields exist, and the server rejects ones that appear. This matches "donation-based, nobody pays to take part".

## 3. Data model (additive only)

No column is dropped or retyped. Migration is a new folder; it is not run by this PR.

```prisma
enum EventStatus {
  DRAFT
  PENDING_REVIEW   // new value
  PUBLISHED
  CANCELLED
}

model Event {
  // existing fields unchanged, plus:
  organizerId    String?    // user who proposed it; createdById stays "who made the row"
  submittedAt    DateTime?
  reviewedById   String?
  reviewedAt     DateTime?
  reviewNote     String?    // shown to the organizer when sent back
  isFree         Boolean    @default(true)
  rsvpUrl        String?    // https only, optional external sign-up
  category       String?    // see open question 4; falls back to `medium`
  @@index([organizerId, status])
}

model User {
  organizerApprovedAt DateTime?   // only if Robbie wants a separate permission
}
```

Notes:
- Adding a value to a Postgres enum is additive and safe; every place that switches on `EventStatus` needs a test for the new value (public lists must keep filtering to PUBLISHED).
- Existing rows get `isFree=true` by default; that is true of every night today. Confirm before relying on it.
- Reports: add `EVENT` to `ReportTargetType` (additive).
- Audit: reuse `AuditLog` with actions `event.submit`, `event.approve`, `event.return`, `event.withdraw`.

## 4. Routes

Organizer (gate: real session, approved ARTIST or ADMIN, not suspended, plus `organizerApprovedAt` if adopted):
- `POST /api/v1/organizer/events` create, always `PENDING_REVIEW` (or `DRAFT` with `?draft=1`).
- `GET /api/v1/organizer/events` my submissions with status and `reviewNote`.
- `PATCH /api/v1/organizer/events/[id]` edit while DRAFT or returned; editing a PUBLISHED one sends it back to review.
- `POST /api/v1/organizer/events/[id]/withdraw` (also cancels a published one of mine).
- `POST /api/v1/organizer/events/media` cover image through the existing upload store rules.

Admin (existing `requireAdmin`):
- `GET /api/v1/admin/events?status=PENDING_REVIEW` review queue.
- `POST /api/v1/admin/events/[id]/approve` and `/return` (body: `note`).
- Existing `/publish`, `/cancel` keep working.

Public: `GET /api/v1/events` unchanged (PUBLISHED only). Event DTO gains optional `organizer` (name, handle) and `isFree`.

Safe fields for organizers: title, description, medium/category, times, venue name and address, capacity, cover image, rsvpUrl. Admin-only stays admin-only: sponsor, vendors, `comingSoon`, status changes to PUBLISHED.

## 5. UI pages (web)

- `/organize` (new): what it is, rules in plain words, "Create an opportunity" button. Signed-out and unapproved visitors see how to get approved (link to /join and the artist agreement).
- `/organize/new` and `/organize/[id]`: one short form, preview, submit. Status chip: Draft, In review, Live, Sent back (with note), Cancelled.
- `/organize` list of "my opportunities".
- `/admin/review` (new web page, or tab inside the mobile app first): queue, preview, Approve, Send back with note, Remove.
- Entry points: a card on `/get-involved` (events door), `/programs`, and Studio hub.
- Public: an "Hosted by <artist>" line on `/event/[id]`, a Report button, and a "Free" badge.

Copy follows the site voice (plain, kind, "free opportunities for local creatives").

## 6. Moderation and anti-spam

- Review before publish (Phase 1 default). Nothing goes live unreviewed.
- Caps: 3 pending submissions per organizer, 5 submissions per day, 10 upcoming live events per organizer. Server-enforced, plain-English errors, config in one file (same pattern as `src/content/booking.ts` in PR #54).
- `textFilter.screenText` on title and description; link cap (2) in description; https-only URLs; no price/ticket text patterns flagged to the reviewer (not auto-blocked).
- Date sanity: must start in the future, within 12 months, end after start, max 12 hours.
- Duplicate guard: same organizer + same title + same start is rejected.
- Image uploads use the existing store and size/type rules.
- Report on events (`EVENT` target) with the existing rate limit; N distinct reports auto-hides pending admin look (Phase 3).
- Admin can suspend organizing for a user (`organizerApprovedAt = null`) without suspending the whole account.
- Notifications: reuse `NotificationType.EVENT` for "approved" and "sent back".
- Everything audited in `AuditLog`.
- Terms: organizer accepts a short "organizer agreement" checkbox (what they host is their own event, TAP only lists it). Wording needs Robbie / counsel (open question).

## 7. What the mobile app needs

The app already reads `/events` and has the admin event form. Needed:
- Organizer: "My opportunities" and a create/edit form (reuse the admin form with fewer fields), status chips, `reviewNote` display.
- Admin: a "Needs review" list with Approve and Send back.
- Event detail: "Hosted by", Free badge, Report.
- Handle the new `PENDING_REVIEW` status value defensively (unknown status = hide), so an older app build does not crash. Public endpoints never return it.
- Push/notification copy for approved and sent back.
- Version gate: new routes are additive, so old builds keep working and just do not show organizer screens.

## 8. Phased plan

**Phase 1 (about one week): ship the loop.**
1. Migration (additive) + status value + organizer fields. Not run until Robbie says go.
2. Organizer create/list/edit/withdraw routes, caps, text filter, tests.
3. Admin queue + approve/return routes.
4. Web: `/organize`, `/organize/new`, my list, minimal admin review page.
5. Public event page "Hosted by" + Free badge.
6. Manual QA on a preview deploy; Robbie approves a test event.
Out of Phase 1: payments, tickets, vendors from organizers, co-hosts.

**Phase 2: app + polish (about one more week).** Mobile screens, notifications, Report on events, organizer profile link, calendar add.

**Phase 3: trust and scale.** Trusted organizers skip review (after N clean events), recurring events, co-hosts, organizer-added vendor requests (admin still approves), category pages, analytics.

## 9. Open questions for Robbie

1. Who can organize: any approved artist, only artists he picks (separate "organizer" approval), or also businesses and venues?
2. Free only for now, or do some events need a ticket link or donation ask (Phase 1 assumes free, no money handled by TAP)?
3. Review before publish every time, or let trusted artists post straight away after a few good ones?
4. Categories: keep the current lanes (music, culinary, community...) or add new ones (workshops, markets, open mics, volunteer calls)?
5. Where can events be: Hacienda only, anywhere in Palm Beach County, or anywhere (no active TAP location in Texas right now, so should a location limit apply)?
6. Does an organizer need to sign something (organizer agreement), and who writes it?

## 10. Risks

- Enum value added to `EventStatus`: any `switch` or filter that assumes three values must be audited. Mitigation: tests that public lists return PUBLISHED only.
- Liability and safety for events TAP does not run: clear "hosted by the organizer" wording, report path, quick takedown.
- Migration is deliberate, not automatic. Merging to main deploys; the schema change must be run on purpose.
