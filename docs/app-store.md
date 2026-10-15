# The Artist Post — App Store readiness (Community v1)

Last updated: 2026-10-15. This file is the working checklist for the first TestFlight build with community features (plan: `docs/superpowers/plans/2026-10-14-community-v1.md`, decisions D1–D11).

**Status words:** *Done* = merged to the branch named. *In progress* = code exists on a branch but is not yet on `feat/community-v1`. *Open* = not started, or waiting on a decision.

## What the app is

- A native app (Expo SDK 57, repo `theartistpost-app`). It shows the same content as the website and talks to the web app's `/api/v1` backend (repo `theartistpost`).
- The web backend is production: a push to its `main` deploys within about 3 minutes. Nothing merges to `main` without an explicit go.
- Members sign in with an emailed code. There are no passwords. No social logins are planned for v1.
- Tabs for Community v1: **Home · Wall · Community · Schedule · You**. Today's app branch still shows the older tabs (Home, Wall, Schedule, Kindness, Studio). The Community board and onboarding screens are *In progress*.

Do **not** invent featured artists, people, posts, events, counts, or nonprofit facts. Every list needs an honest empty state.

## Build and submit

| Item | Value | Status |
|---|---|---|
| Bundle ID (iOS) | `org.theartistpost.app` | Open: `app.json` still has the dev ID `agency.fluxlab.theartistpost.dev`. Switch before the production build. |
| Android package | `org.theartistpost.app` | Open, same as above |
| Version | `1.0.0` in `app.json` | Open: confirm EAS uses a remote version source before the first production build |
| Build tool | EAS Build and EAS Submit (`production` profile, App Store Connect API key) | Open until credentials are set |
| Encryption | Standard HTTPS only (`usesNonExemptEncryption: false`) | Done in config |
| iPad | Not supported (`supportsTablet: false`) | Done in config |
| Sign in with Apple | Not required: email code is the only sign-in | Done by design |
| Push notifications | Not in v1 (decision D8). No push permission prompt. | Done by design |
| Direct messages | Not in v1 (decision D9) | Done by design |

The earlier Capacitor wrap section of this document is superseded. The iOS app is built with EAS, not Capacitor.

## App Store Connect listing (draft)

**Name:** The Artist Post
**Subtitle:** Kindness. Local art. Hacienda.
**Category:** Lifestyle (secondary: Entertainment)
**Age rating:** **12+ (expected; confirm in App Store Connect).** The earlier "4+ (no user-generated chat)" is obsolete. See the age rating section.

**Promotional text**
West Palm Beach’s living gallery — free showcase space, Kindness Always, and a house for local creatives at Hacienda on Clematis.

**Description**
The Artist Post® connects artists, small businesses, and communities by providing free opportunities for local creatives to showcase, sell, and grow through kindness and collaboration.

- Explore The Wall
- Join the Community board: shout-outs, collab calls, showings, questions, and kindness notes
- Follow artists and see what they post
- Follow the artist schedule and save a night
- Get Involved — book space, partner, volunteer, or give
- Visit Hacienda at 522 Clematis Street

All proceeds raised go towards local arts, the artists, the venues, and local community events.

**Keywords:** art,gallery,west palm beach,kindness,nonprofit,local artists,hacienda

**Support URL:** https://theartistpost.fluxlab.agency/support
**Privacy URL:** https://theartistpost.fluxlab.agency/privacy
**Marketing URL:** https://theartistpost.fluxlab.agency
**Deletion page (Google Play):** https://theartistpost.fluxlab.agency/delete-account

URL check on 2026-10-15:

| URL | Result |
|---|---|
| theartistpost.org/privacy, /support, /terms | 404 (GoDaddy apex is still in place) |
| theartistpost.fluxlab.agency/privacy, /support, /terms | 200 |
| theartistpost.fluxlab.agency/delete-account | 404. It ships with the web release, so re-check after deploy. |

Use the fluxlab.agency URLs until the apex DNS points at the VPS. Re-check every URL on a clean device before submitting.

## Age rating (App Store Connect questionnaire)

| Question | Answer | Why |
|---|---|---|
| User-generated content | **Yes** | Community board posts, Wall notes, replies, profiles, bios, and photo uploads |
| Unrestricted web access | **No** | Links open in an in-app browser for the house's own pages and forms. Donations and merch open in Safari. |
| Messaging or chat | No | Direct messages are not in v1 |
| Gambling, contests, horror, violence, alcohol, drugs, sexual content | No | None in the app. Confirm each answer against current App Store Connect wording. |

**Expected result: 12+. To confirm in App Store Connect.** Do not submit with the old 4+ answer.

## Guideline 1.2: user-generated content

| Requirement | How the app meets it | Where in the app / system | Status |
|---|---|---|---|
| Terms for users | Members accept the Community Guidelines before they can post to the board. A handle is also required. The acceptance is stored with a timestamp. | Guidelines text is at `/legal/guidelines`. Welcome step (A3). Web `POST /me/terms`. | Web: Done. App: In progress (Welcome step). |
| Filter objectionable material | Blocklist and link cap run on community posts and Wall notes before they are saved. Blocked text gets the message "Let's keep it kind — please rephrase." | Web `textFilter.ts`, used by community posts and Wall notes | Web: Done (feat/community-v1). App: shows the message from the server. |
| Report content | Report on Wall works, Wall notes, community posts, and people. The report form asks for a reason and an optional note. | App `⋯` menu → Report; `POST /reports` | Web: Done. App: Done (report sheet). The `⋯` menu is mounted on Wall works and notes; it is not yet on community cards (A6). |
| Auto-hide | Three distinct open reports hide a note or community post. A Wall work is archived. The author is not suspended automatically. | Web `AUTO_HIDE_THRESHOLD = 3` | Web: Done |
| Admin review | Admins see open reports grouped by target. They can hide, dismiss (which restores auto-hidden items), or suspend the author. Every action is audited. | App Settings → Moderation (admins only); web `/api/v1/admin/reports` | Web: Done. App: Done. |
| Suspend abusive users | A suspended account is read-only. It can still read and delete itself. | Web `suspendedAt`; writes return `forbidden` | Web: Done |
| Block abusive users | Block from the `⋯` menu. Blocks remove follows both ways and hide each side's content from the other. Blocked list in Settings. | App `⋯` menu; Settings → Blocked; web `/api/v1/blocks` | Web: Done. App: Done. |
| Timely response to reports | **"The house team reviews reports within 24 hours."** This is the promise shown to reporters. | Report confirmation text | **OPEN DECISION (Robbie):** name who answers reports within 24 hours. Until that is decided, the promise must not go to review. |
| Published contact | Support page and support email | `/support` on the web | Done |

Not in v1 (say so in review notes): direct messages (D9) and push alerts (D8). Both would need their own moderation work first.

## Guideline 5.1.1(v): account deletion

- **In the app:** Settings → **Delete account** → type `DELETE` → confirm. The account is removed and the app signs out.
- **What is removed:** profile, photo, bio and topics; follows and followers; community posts, replies, and support; notifications; blocks; reports filed; Wall comments and likes; works published by the account.
- **Audit record:** a record that the account was deleted, holding only a one-way SHA-256 hash of the email.
- **Web page for Google Play:** `/delete-account` describes the in-app steps and an email fallback. It returns 404 today and goes live with the web release.
- **Test before submit:** delete a test account on a clean device. Check that the sign-in then fails, and that the profile is gone from another account's view.

## App Privacy ("nutrition label") draft

Apple's rule: "Linked to user" means the data is tied to the account. "Tracking" means data used across other companies' apps or sites. The app does neither.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact info: name | Yes | Yes | No | App functionality |
| Contact info: email | Yes | Yes | No | App functionality (sign-in code, account) |
| Contact info: phone (optional, Get Involved form only) | Yes, if entered | Confirm: is the form linked to an account? | No | App functionality |
| User content: photos | Yes, if uploaded (avatar, community image, Create) | Yes | No | App functionality |
| User content: other user content | Yes: bios, headlines, community posts, replies, Wall notes, report notes | Yes | No | App functionality |
| Identifiers: user ID | Yes | Yes | No | App functionality |
| Location | **No device location.** Profile location is free text the member types (for example, a city). Declare it under Other user content, not Location. | — | No | — |
| Usage / product interaction | No, unless Pulse analytics ships | — | No | — |
| Diagnostics | Not verified. Check the final build before submit. | — | No | — |

**Stays on the device (not collected):** kindness notes left on this phone, saved works and nights, theme, motion preference.

**Tracking:** No. The iOS privacy manifest must declare `NSPrivacyTracking: false`. Required-reason API entries: UserDefaults `CA92.1`, FileTimestamp `C617.1`, SystemBootTime `35F9.1`, DiskSpace `E174.1` (plan P4). Confirm these against the build.

## Review notes (draft for App Review)

- **What this is:** The Artist Post is a community arts hub run by a 501(c)(3) nonprofit, EIN 85-2609788, in West Palm Beach. Showcase space is free for artists.
- **Donations and merch:** donations open PayPal in Safari. Merch opens Bonfire in Safari. Nothing is bought inside the app.
- **Sign in:** email code only, no password. Enter your email, then the code we send.
- **Demo accounts:** **TBD — created on production after deploy.** Do not paste credentials into this file. The review code goes in the App Store Connect "Sign-in information" field only.
- **How to reach user-generated content:**
  1. Sign in and accept the Community Guidelines.
  2. Community tab: board posts, shout-outs, replies, and support.
  3. Wall works: open a work to see its notes.
  4. On any post, note, or profile, tap `⋯` → Report (reasons and a note) or Block.
  5. Settings → Blocked to see and undo blocks.
  6. Settings → Delete account to delete the account.
- **Moderation:** reports are read by the house team. Three open reports hide an item automatically. Admins can hide, dismiss, or suspend. Admin tools are not visible to members.
- **Content:** no invented artists or events. Empty states are honest. Coming-soon labels stay until real assets arrive.

## Screenshots

Real content only. No mocked artist portraits, no made-up community posts. Robbie signs off each screen.

**iPhone (6.9", 1320 × 2868):** Home · Wall (real approved works) · Community board · Schedule (real nights) · You (profile).
**Android (1080 × 2400):** the same five screens.

Notes:
- If the Community board has no real posts yet, the honest empty state can be shown, but it is a weak screenshot. Prefer one real post, with the author's permission.
- Check sizes against current App Store Connect requirements before upload.

## Open before submission

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Age rating answered with UGC = yes; result confirmed 12+ | Jonathan | Open |
| 2 | Who answers reports within 24 hours | Robbie | **OPEN DECISION** |
| 3 | Community board and Welcome onboarding on `feat/community-v1` | Engineering | In progress |
| 4 | `⋯` menu on community cards and profiles (A6) | Engineering | Open |
| 5 | Guidelines reachable from Settings and the join flow | Engineering | Open |
| 6 | Bundle ID switched to `org.theartistpost.app` | Engineering | Open |
| 7 | apex DNS or fluxlab.agency URLs confirmed live on a clean device | Jonathan | Open |
| 8 | `/delete-account` live after the web release | Jonathan (deploy GO) | Open |
| 9 | Demo accounts created on production; review code stored in App Store Connect | Jonathan | TBD |
| 10 | Web release: migration only after a `pg_dump` and Jonathan's go | Jonathan | Open |
| 11 | Real screenshots approved by Robbie | Robbie | Open |
| 12 | Privacy label and manifest checked against the build | Engineering | Open |
