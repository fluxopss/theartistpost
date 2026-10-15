# Donations in The Artist Post app — proposal

**Date:** 2026-10-15 · **Status:** Draft for decision · **Type:** Proposal only. No code, no accounts, no payment systems touched.
**Decision makers:** Robbie Alvarez (founder) and Jonathan Augusto (CTO). Money flows need both.
**Goal:** Artists can "hook up" donations so people can support a specific artist, but every dollar is received and managed by The Artist Post Inc. (TAP), never paid to artists through the app.

> **Rule for this document:** Fees and platform rules below are cited from the source I read on 2026-10-15. Where I could only find a secondary source, or could not confirm something, it says so. Nothing here is legal, tax or accounting advice; Robbie's foundation brief already requires qualified review before launch (section 5).

---

## 0. Short version

1. **Today** a donation is a link out to a hosted PayPal button (or a Venmo handle). The website also has a "steward" form that tags an email in GoHighLevel. Nothing connects a gift to an artist, and nothing records an amount.
2. **Both stores allow what we do today**: a button that opens the web. Apple lets a *non-approved* app collect charity money only outside the app (Safari). Google says Play Billing must not be used for tax-exempt donations.
3. **Native, in-app giving is possible later**, but on Apple it requires TAP to be an *approved nonprofit* (Candid Seal → Apple Pay approval), and the campaign must offer Apple Pay, disclose how funds are used, and make tax receipts available.
4. **Recommended path:** v1 keeps PayPal and adds a *designation* ("I'd like to support Maya") captured by TAP, opened from artist profiles and Wall posts in the system browser. Then move processing to Stripe (nonprofit pricing, webhooks, Apple Pay), and add native Apple Pay once the listing lives under TAP's own Apple account.
5. **Designation must be a wish, not a purchase of an outcome.** Money goes to TAP; TAP keeps discretion over how it supports artists. That is both the principle Jonathan described and the safest posture for tax treatment (counsel to confirm).

---

## 1. Current state (read from the repos)

### Web (`fluxopss/theartistpost`, `main` at `a0bb20c`)

| Piece | Where | What it does |
|---|---|---|
| Donate page | `src/app/donate/page.tsx` → `src/features/donate/DonateExperience.tsx` | Hero with two buttons, "Give once with PayPal" and "Give monthly with PayPal". Venmo link. Sponsor and merch paths. Transparency block (legal name, EIN, address, "all proceeds…" line). Steward form at the bottom. |
| Money links | `src/content/site.ts` (`links.donate`, `links.donateMonthly`, `site.venmo`) | `links.donate` and `links.donateMonthly` are the **same** PayPal hosted-button URL. Monthly only works if "Make this a monthly donation" is enabled on TAP's PayPal account; the code comments say to confirm this in PayPal, and I have not been able to confirm it. Venmo is `@theartistpost`, opened as `venmo.com/u/theartistpost`. |
| Steward form | `src/features/donate/DonorStewardForm.tsx` → `POST /api/v1/donate/steward` (also `/api/donate/steward`) | Takes **email + cadence** (`one_time` or `monthly`). Explicitly "CRM tag only, not a payment". |
| Server | `src/server/api/leads/donor.ts` → `sendLeadToGhl` in `src/lib/ghl.ts` | Posts a lead to the GHL inbound webhook with `intent: "donor"`, `medium: cadence`, `source: "theartistpost-donate"`, `page: "/donate"`. Comments map this to tags `donor`, `donor.one_time`, `donor.recurring`/`sustainer`. |
| Reconciliation | Comment in `src/lib/ghl.ts` | "PayPal IPN → GHL is not wired yet — ops can hand-tag from PayPal exports until then." |
| Copy and legal | `copy.donate` in `src/content/site.ts`; `src/app/privacy`, `src/app/terms` | "Receipts come from the processor." EIN and 501(c)(3) line as published. Privacy page says TAP does not see card numbers. |
| Data model | `prisma/schema.prisma` | `User`, `ArtistProfile` (handle, bio, `approved`), `Post` (slug, author). **No donation, designation or amount table.** |

### App (`fluxopss/theartistpost-app`, `main` at `c91ff89`)

- `src/screens/donate/index.tsx` is the whole Donate screen: brand image, "Give once / Give monthly with PayPal" buttons (`Linking.openURL` to the same PayPal URL, system browser), a Venmo row, sponsor and merch rows, and the transparency block. Its own comment: "Payments stay on PayPal/Venmo — this screen is the house story, not a checkout."
- `src/utils/links.ts` forces `paypal.com` and `venmo.com` to open in the **system browser**, not an in-app view.
- The artist screen (`src/screens/artist/index.tsx`) only has a generic "support the house" button in its empty state, routing to `/donate`. There is **no per-artist giving** and no steward form in the app.
- `docs/app-store.md` (web repo) already states the position for review: "donations open PayPal in Safari … Nothing is bought inside the app."

### Gaps this proposal addresses

1. No link between a gift and an artist.
2. The steward form is **self-reported**: anyone can type an email and get tagged as a donor. It is not proof a gift happened.
3. No amounts, dates or provider transaction IDs in TAP's own records. Everything lives in PayPal's dashboard and a hand-tagged GHL.
4. No staff reporting; no donor privacy choices; no refund process written down.
5. Monthly giving depends on a PayPal setting nobody has verified in this review.

---

## 2. Platform rules

### Apple — App Store Review Guidelines

Source: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (read on the page itself, section 3.2) and [Apple Pay for nonprofits](https://developer.apple.com/apple-pay/nonprofits/).

| Guideline | What it says (paraphrased closely; wording is Apple's) | What it means for TAP |
|---|---|---|
| **3.2.1(vi)** | Approved nonprofits may fundraise directly within their own apps, provided campaigns follow the guidelines and **offer Apple Pay**. Apps must **disclose how funds will be used**, follow local and federal law, and **ensure appropriate tax receipts are available**. Nonprofit platforms that connect donors to *other* nonprofits need each one approved. | In-app giving is allowed **only if TAP is an approved nonprofit**, and then it must use Apple Pay and meet the disclosure and receipt duties. Artists are individuals, not nonprofits, so the "platform for other nonprofits" clause does not apply, but it is a reason to keep every gift going to TAP only. |
| **3.2.2(iv)** | Unless approved or covered by 3.2.1(vi), apps may not collect funds in-app for charities and fundraisers. Such apps must be **free** and may collect funds **only outside the app, such as via Safari or SMS**. | This is exactly what the app does today. It is the **safe fallback** for every phase. |
| **3.2.1(vii)** | Individuals may give a monetary gift to another individual without in-app purchase if it is optional and **100% of funds go to the receiver**. | **Does not apply and we should not lean on it.** Our model is the opposite: gifts go to TAP, not to the artist. Do not describe "Support this artist" as a gift to the person. |

**How approval works (U.S.):** Apple's page says U.S. nonprofits need a **Candid Seal of Transparency**; "all seal holders are approved to accept donations through Apple Pay", and earning a Seal is free. Apple takes **no fee or commission** on Apple Pay. The page does not say whether approval attaches to a specific Apple Developer team, and TAP's app is currently built under the Flux Labs team (TestFlight "The Artist Post Beta"). **Open question for Apple Pay Merchant Support:** must the approval sit on the same team that publishes the app? Until answered, assume native Apple Pay waits for the listing to move to TAP's own account.

**Secondary source, flagged:** Candid's seal tiers and exact Bronze field list changed between 2022 and 2023 pages I found; confirm current requirements on candid.org before relying on a count. Sources: [Candid intro to seals](https://learning.candid.org/introduction-to-seals-of-transparency).

**Technical note for Phase 3:** Stripe's [React Native Apple Pay guide](https://docs.stripe.com/apple-pay.md?platform=react-native) says Expo Go does not support Apple Pay (development build required) and that Apple Pay needs an Apple Merchant ID plus a Stripe-issued certificate.

### Google Play — Payments policy

Source: [Understanding Google Play's Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738), Section 3.

- Google's text lists cases where **Play's billing system must not be used**, and one of them reads: "payments include peer-to-peer payments, online auctions, and tax exempt donations". So donations to a tax-exempt organization are **outside** Play Billing, so we would not route them through Google's billing system.
- The page does not define "tax exempt donations" or say how Google verifies them.
- **Verification is real in practice.** A September 2026 report ([Gigazine](https://gigazine.net/gsc_news/en/20260902-ankidroid-google-play-policy-violation/), secondary source) says Google told the AnkiDroid project it was "not eligible to solicit donations within the app" and that donations "can only be accepted from organizations that meet the criteria of being tax-exempt", citing 501(c)(3) as an example. Google did not accept a 501(c)(6) fiscal host. TAP *is* a 501(c)(3) by its own published line, so this should not bite us, but **keep the IRS determination letter ready** to answer a Play review.
- For Google Pay API specifically, Google's [Pay API FAQ](https://developers.google.com/pay/api/android/support/faq) (via search result, not read in full) says approved nonprofits must provide documentation proving nonprofit status, and for U.S. orgs valid 501(c)(3) proof from the IRS.

### What we can do where

| Capability | iOS today (not approved) | iOS if approved (Apple Pay) | Android |
|---|---|---|---|
| "Support this artist" button that **opens the web** (Safari / Chrome) | **Yes** (3.2.2(iv)) | Yes | **Yes** (donations are outside Play Billing) |
| Show donate copy, EIN, "how funds are used", thank-yous in-app | Yes | Yes | Yes |
| Enter card or tap Apple Pay **inside the app** | **No** | **Yes**, and Apple Pay must be offered | Allowed for tax-exempt donations; Google Pay needs nonprofit documentation |
| Card form in-app **without** Apple Pay on iOS | No | **No** (3.2.1(vi) requires Apple Pay support) | Allowed |
| Gift framed as going **to the artist** | Do not do this | Do not do this | Do not do this |
| In-app purchase (Apple IAP / Play Billing) for donations | Not needed, not wanted | Not needed | **Must not** use Play Billing |

---

## 3. Product design

### 3.1 User experience

- **Where it appears:** On an artist profile and on that artist's Wall posts, a button reads **"Support {Name} through The Artist Post"**. It only appears if the artist has opted in (default **off**; see 3.4).
- **What it says (draft, subject to counsel):** "Your gift goes to The Artist Post, a 501(c)(3) nonprofit. You can tell us you'd like it to support {Name}. We pass your wish to our team; The Artist Post decides how artists are supported. Gifts are not paid directly to artists through this app."
- **v1 flow:** tap → system browser opens `theartistpost.fluxlab.agency/donate?for={handle}` (and `&post={slug}` from a Wall post) → page confirms the designation, optionally collects email and a "show my name to {Name}" checkbox → continues to PayPal. Same page works on web.
- **Later flows** (Phase 2/3) keep the same page but use TAP's Stripe Checkout, then native Apple Pay.

### 3.2 What "designation" means (and does not)

- A designation is **a tag on TAP's own record** that a donor wished to support a given artist. It drives thank-you stewardship and TAP's own reporting.
- It is **not** a payout instruction, an escrow, or a per-artist balance. TAP receives 100% of funds into TAP's account and decides, outside the app, whether and how to support the artist (materials, showcase costs, event costs, etc.).
- Wording should say "your wish", never "your gift will go to {Name}". This is a design requirement because the IRS says in [Publication 526](https://www.irs.gov/publications/p526): "You can't deduct contributions earmarked for relief of a particular individual or family." That sentence sits in the section on contributions to individuals and is about *relief*, so how it applies to arts support is a **question for TAP's counsel**, not a conclusion here. Keeping TAP in control is the conservative design either way.

### 3.3 Proposed records (illustrative, not a migration)

One `Donation` record per gift plus an optional designation, owned by TAP staff:

| Field | Notes |
|---|---|
| `id`, `createdAt` | |
| `provider`, `providerTxnId`, `status` | `paypal`/`stripe`/`apple_pay`; `pending`/`completed`/`refunded`/`disputed` |
| `amountMinor`, `currency` | Visible to TAP staff only |
| `cadence` | `one_time` or `monthly` |
| `donorEmail`, `donorName` | Optional; used for thank-you and receipt matching |
| `designatedArtistId`, `designatedPostId` | Nullable; **a tag, not a payout** |
| `shareNameWithArtist` | Default false; explicit checkbox |
| `source` | `web`, `ios`, `android` |
| `ghlContactId` | Link to stewardship record |

Prisma has no such model today; this would be a new migration, which per the team's ops notes needs Jonathan's explicit go on the VPS side.

### 3.4 Artist control and privacy

- **Artists opt in** with a profile switch ("Let supporters name me when they give"). Default off. Turning it off hides the button; past designations stay in TAP's records.
- **Artists see:** a count of supporters and, only for donors who ticked the box, display names. **Never amounts**, never emails. Whether artists ever see amounts is **TAP's decision**, not a default.
- **Donors:** anonymous by default. Name sharing is a checkbox, not pre-ticked.
- **No public totals, leaderboards or rankings.** Donations never influence Wall order or discovery.
- **If an artist is suspended or removed**, new designations to them stop; existing ones remain in TAP's records and fall back to the general fund for stewardship purposes.

### 3.5 Receipts, refunds, reporting

- **Receipts:** the processor issues the transaction receipt (PayPal today; Stripe can send receipt emails, to confirm in the dashboard). TAP's own acknowledgment letter for larger gifts is an accounting item: the IRS publications [526](https://www.irs.gov/publications/p526) and 1771 cover "Contributions of $250 or More" and written acknowledgment; **TAP's CPA decides** the wording, threshold handling and year-end process. The Apple rule also requires that "appropriate tax receipts are available to donors" for in-app campaigns.
- **Refunds and disputes:** TAP staff only, from the processor dashboard, never from the app. Stripe's published dispute fee is $15 per dispute received ([Stripe pricing](https://stripe.com/pricing)); a clear thank-you and receipt flow lowers disputes.
- **Reporting (staff view, Phase 1 minimal):** table by artist and period with count and total; export to CSV; list of gifts with `status`; reconciliation column showing "matched to PayPal export" or "unmatched". Retention periods: counsel.
- **How TAP supports the artist:** TAP's call, outside the app, with its own approval record. The app only tells TAP "{N} people asked to support {Name}".

---

## 4. Provider options

All numbers are U.S. domestic rates for online donations. "Verified" means read on the vendor's own page on 2026-10-15; otherwise the source is named.

| Option | What TAP pays | Receipts | Designation / webhooks | Apple Pay in app | Notes |
|---|---|---|---|---|---|
| **PayPal Donate button** (current) | **2.89% + $0.49** per donation; international +1.50% ([PayPal fees](https://www.paypal.com/us/webapps/mpp/merchant-fees), verified). **Charity rate 1.99% + $0.49**, "subject to eligibility, application, and pre-approval by PayPal" (same page). Venmo checkout is listed at 3.49% + $0.49 as a commercial rate; no donation-specific Venmo rate is listed. | From PayPal | Hosted button does not give us a verified per-artist field. Our code says IPN → GHL is not wired. Treat as **manual reconciliation** in v1. | No | Already live. **Unknown: whether TAP is already on the charity rate.** Check the PayPal account first. |
| **PayPal Giving Fund** | PayPal's help says it charges **no fees** to charities or donors and covers transaction fees on donations made through PayPal's own app/site ([PayPal help](https://www.paypal.com/us/smarthelp/article/FAQ4082), via search; partners may charge). | From PayPal | Not designed for per-artist tags | No | Worth a question to PayPal; eligibility, grant timing and branding not verified. Does not give us our own donation flow. |
| **Stripe** | Standard **2.9% + 30¢**; Apple Pay at the same rate; +1.5% international; $15 dispute fee; Stripe Billing 0.7% of billing volume if using subscriptions ([Stripe pricing](https://stripe.com/pricing), verified). **Nonprofit discounted fees** exist for accounts where "at least 80% of your Stripe payment volume comes from tax-deductible donations"; apply with EIN or IRS letter ([Stripe support](https://support.stripe.com/questions/fee-discount-for-nonprofit-organizations), verified). The **2.2% + 30¢** figure appears in third-party guides (e.g. [Givebutter](https://givebutter.com/blog/stripe-for-nonprofits)) but **Stripe's page does not state it**; get it in writing. | Stripe receipt emails (configure and confirm) | **Yes**: metadata on a Checkout Session/PaymentIntent carries `artistHandle`; webhooks write our `Donation` row and GHL tag automatically | **Yes**, via React Native SDK ([Stripe docs](https://docs.stripe.com/apple-pay.md?platform=react-native)) | The 80% rule means **keep this Stripe account donation-only**; membership fees, tickets, tuition and auctions don't count. Merch (Bonfire) is already separate. |
| **Square** | Online **3.3% + 30¢** on the Free plan, **2.9% + 30¢** on Plus/Premium; no nonprofit discount ([Square pricing](https://squareup.com/us/en/pricing), via search summary of the page; confirm live). | Square | Possible via API | Possible | No nonprofit rate, so no reason to pick it for online donations. |
| **Givebutter** | **0% platform fee when donor tips are on; flat 3% platform fee if tips are off**; cards 2.9% + 30¢, ACH 1.9% + 30¢; free plan listed ([Givebutter pricing](https://givebutter.com/pricing), verified). | Page does not address receipts | Funds/campaigns; per-artist fund not verified | Page does not mention Apple Pay | Tips are donor-optional but **prompted by default**, which sits awkwardly with Kindness Always. Per-artist public campaign pages would look like crowdfunding for individuals. |
| **Donorbox** | Standard plan **2.95%** platform fee (3.95% memberships/events/peer-to-peer); Pro **$150/month** at 1.75% (2%); processor fees (Stripe/PayPal) are **on top** ([Donorbox pricing pages](https://donorbox.org/pricing), via search summary; could not read the live page, confirm). | Donorbox | Yes, forms and custom fields | Not verified | Highest all-in cost of the options above. |
| **Apple Pay via Stripe** | **Apple charges no fee** ([Apple](https://developer.apple.com/apple-pay/nonprofits/)); Stripe's card rate applies. | Stripe | Same as Stripe | Yes, if approved | Needs Candid Seal, Apple Merchant ID, Stripe certificate, development build (not Expo Go). |

**Illustrative cost on a $25 gift** (my arithmetic from the rates above, not a quote): PayPal charity **$0.99**; PayPal donate button **$1.21**; Stripe standard **$1.03**; Stripe at the reported nonprofit 2.2% + 30¢ **$0.85** (unconfirmed rate); Donorbox Standard on top of Stripe standard **about $1.76**; Givebutter with tips off on top of Stripe-type card fees **about $1.78**. On $100: PayPal charity $2.48, PayPal donate $3.38, Stripe standard $3.20, Stripe at 2.2% + 30¢ $2.50. The differences are cents per gift; **designation capture and automatic records matter more than the fee delta.**

### Recommendation

1. **v1: keep PayPal.** It is already live, TAP already trusts it, receipts come from PayPal, and it needs no new account. Add the designation on TAP's side and reconcile manually. Verify the charity rate (1.99% + $0.49) is applied; apply if not.
2. **v2: Stripe in TAP's own name**, donation-only account, nonprofit pricing application, Checkout on web. Gives webhooks (automatic `Donation` rows and GHL tags), refunds from one dashboard, and the path to Apple Pay and Google Pay.
3. **v3: native Apple Pay via Stripe**, only after TAP is Apple-approved and the app listing sits under TAP's own account.

Why Stripe over the hosted-page vendors: no platform fee or monthly fee on top of processing, designation travels as metadata we control, and it is the same rail Apple Pay will use. Why not Givebutter/Donorbox now: a second donor database next to GHL, a tip prompt or platform fee, and per-artist campaign pages we do not want.

---

## 5. Principles check and review required

| Founding principle | Check |
|---|---|
| **Artists First (artists never charged)** | No fee, deduction or cost is ever applied to an artist. Opt-in is theirs; they can switch it off. Designation does not reduce or add to any artist balance. **Guardrail:** no pressure to solicit; the button never appears for an artist who didn't opt in. |
| **Venue Partnerships (no fees where possible)** | Giving touches no venue. No venue fee is introduced. |
| **Sponsorship Model (main revenue)** | Donations sit beside sponsorship, not instead of it. The Donate screen keeps the Sponsor path equal in weight. Do not let "support an artist" become the main ask in the app. |
| **Community Engagement** | Supporters can say thanks and be thanked; names only with consent; no totals or leaderboards. |
| **Kindness Always** | Gentle copy, no guilt, no countdowns, no default tips, no amounts shown to artists. A gift is thanked, not ranked. |

### Review before launch (from Robbie's foundation brief)

Robbie's brief puts donations, recurring gifts and payments in Phase 3 and says tax wording, receipts, retention and privacy copy need review by qualified nonprofit, accounting and legal professionals. Concretely, before anything ships:

1. **Tax wording** on the donate page and in the app ("tax-deductible" language, EIN line, "wish" wording for designation).
2. **Earmarking:** is a non-binding designation to a named artist acceptable, and what must the Terms say so TAP keeps control (IRS Pub. 526 language above)?
3. **Receipts and acknowledgments:** content, timing and tooling for the $250-and-up written acknowledgment, any quid-pro-quo disclosure, year-end statements.
4. **Retention and privacy:** how long donation records are kept, what the privacy page and Apple/Google data forms must say, and how name-sharing consent is stored.
5. **Solicitation rules:** whether any state charitable-solicitation registration or disclosure applies to in-app and web solicitation (question for counsel; not researched here).
6. **Paying artists from TAP funds:** whatever TAP later does to support artists is outside this app, but its tax treatment (stipends, payments, reimbursements) needs the accountant before TAP promises anything publicly.

---

## 6. Phased plan

Effort figures are my rough engineering estimates for one developer, excluding review wait time. They are not commitments.

| Phase | Scope | Rough effort | Depends on |
|---|---|---|---|
| **0. Groundwork (no code)** | Confirm PayPal charity rate and whether monthly is enabled; claim/earn the Candid Seal (free per Apple's page); put TAP's IRS letter in a known place; engage counsel and CPA on section 5; write the donor-facing wording. | ~1–2 weeks elapsed, mostly waiting | Robbie + Jonathan |
| **1. v1 — designated gifts via PayPal** | Web: `/donate?for={handle}` (+ `&post=`) page, designation intent saved server-side, artist opt-in switch, GHL fields for designated artist and consent (one tag, not a tag per artist), privacy/terms text, simple staff table and CSV export. App: "Support {Name}" on artist profile and Wall post opens the system browser (reuses the existing `paypal.com` system-browser rule in `links.ts`). Manual reconciliation against PayPal exports. | Web ~4–6 dev days; app ~1–2 dev days; QA ~1 day | Phase 0 wording; a migration (needs Jonathan's go) |
| **2. Stripe in TAP's name** | New Stripe account owned by TAP with nonprofit pricing applied; Checkout with metadata; webhook → `Donation` rows and GHL; receipts configured; refund and dispute runbook; recurring gifts; PayPal stays as an alternate. | ~1–2 weeks | Robbie + Jonathan approve account, bank account and pricing; counsel sign-off on receipts |
| **3. Native Apple Pay (if eligible)** | Apple approval on TAP's team; Merchant ID and Stripe certificate; Stripe React Native SDK in a development build; "Donate with Apple Pay" on the Donate screen and artist profile; App Review notes with fund-use disclosure; Google Pay for Android with nonprofit documentation. | ~1–2 weeks dev plus approval lead time | Listing moved to TAP's Apple account; Phase 2 live |

**Safe at every step:** if any approval stalls, the app falls back to "open the web", which both stores allow.

---

## 7. Decisions needed

| # | Decision | Owner | Recommended default |
|---|---|---|---|
| 1 | Adopt "designation = TAP records a donor's wish; TAP decides how to support artists"? | Robbie + Jonathan | **Yes**; counsel to confirm wording. |
| 2 | Artists opt in to be nameable by supporters? | Robbie | **Opt-in, default off.** |
| 3 | What artists can see about supporters | Robbie | **Display names only with donor consent; never amounts or emails.** |
| 4 | v1 rail | Jonathan | **PayPal now**, with designation capture and manual reconciliation. |
| 5 | Open a Stripe account in TAP's name and apply for nonprofit pricing | Robbie + Jonathan (money flow) | **Yes, after counsel and CPA input**; keep it donation-only. |
| 6 | Earn the Candid Seal now | Robbie | **Yes**; it is free and gates Apple Pay. |
| 7 | Native Apple Pay timing | Jonathan | **After the listing moves to TAP's Apple account**; confirm the team question with Apple. |
| 8 | Engage nonprofit counsel and a CPA for section 5 | Robbie | **Yes, before Phase 1 goes live publicly.** |
| 9 | Show public totals or leaderboards | Robbie | **No.** |
| 10 | Venmo in the designated flow | Robbie + Jonathan | **Exclude**; Venmo cannot carry a designation. Keep the existing handle on the general Donate page. |
| 11 | Refund policy | Robbie | **Staff-only, case by case, from the processor dashboard**; no fixed window until counsel reviews. |
| 12 | Donor record retention | Counsel + Robbie | **Counsel decides**; no retention promise in public copy until then. |

---

## Sources

- Apple: [App Store Review Guidelines, section 3.2](https://developer.apple.com/app-store/review/guidelines/) · [Apple Pay for nonprofits](https://developer.apple.com/apple-pay/nonprofits/)
- Google: [Payments policy, section 3](https://support.google.com/googleplay/android-developer/answer/9858738) · [Google Pay API FAQ](https://developers.google.com/pay/api/android/support/faq) · [AnkiDroid report (secondary)](https://gigazine.net/gsc_news/en/20260902-ankidroid-google-play-policy-violation/)
- PayPal: [fees](https://www.paypal.com/us/webapps/mpp/merchant-fees) · [PayPal Giving Fund fees help](https://www.paypal.com/us/smarthelp/article/FAQ4082)
- Stripe: [pricing](https://stripe.com/pricing) · [nonprofit discount eligibility](https://support.stripe.com/questions/fee-discount-for-nonprofit-organizations) · [Apple Pay, React Native](https://docs.stripe.com/apple-pay.md?platform=react-native)
- Others: [Givebutter pricing](https://givebutter.com/pricing) · [Donorbox pricing](https://donorbox.org/pricing) · [Square pricing](https://squareup.com/us/en/pricing) · [Candid seals](https://learning.candid.org/introduction-to-seals-of-transparency)
- IRS: [Publication 526](https://www.irs.gov/publications/p526)
