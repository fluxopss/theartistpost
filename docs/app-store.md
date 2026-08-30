# The Artist Post — App Store readiness

The product is a **full web app** (PWA) at [theartistpost.org](https://theartistpost.org). The iOS binary is a Capacitor wrapper of that same site — no second codebase.

## What is already a complete app

| Surface | Behavior |
|---------|----------|
| Home / Explore / Schedule / Kindness / Studio | Native tab bar on phones |
| Install | Android prompt + iOS Add to Home Screen |
| Offline | Cached shell + `/offline` fallback |
| Studio | Device identity, saved works/nights, settings |
| Get Involved / Subscribe | Real webhook when `GHL_WEBHOOK_URL` is set |
| Legal | `/privacy` `/terms` `/support` (required for App Review) |

Do **not** invent featured artists, confirmed Hacienda nights, or chapter city leads. Coming-soon labels stay until Robbie supplies assets.

## Capacitor wrap (Xcode on a Mac)

```bash
pnpm add -D @capacitor/cli
pnpm add @capacitor/core @capacitor/ios @capacitor/splash-screen @capacitor/status-bar
npx cap add ios
npx cap sync ios
npx cap open ios
```

`capacitor.config.json` loads `https://theartistpost.fluxlab.agency` (the live Next app on the Flux VPS). Switch the wrap to `https://theartistpost.org` only after that apex DNS points at the VPS — the GoDaddy builder is still on the apex today. After a VPS deploy, TestFlight shows the live site.

Bundle ID: `org.theartistpost.app`  
Version: match `package.json` (`1.0.0`).

## App Store Connect listing (draft)

**Name:** The Artist Post  
**Subtitle:** Kindness. Local art. Hacienda.  
**Category:** Lifestyle (secondary: Entertainment)  
**Age:** 4+ (no user-generated chat in public yet; kindness notes are local/moderated)

**Promotional text**  
West Palm Beach’s living gallery — free showcase space, Kindness Always, and a house for local creatives at Hacienda on Clematis.

**Description**  
The Artist Post® connects artists, small businesses, and communities by providing free opportunities for local creatives to showcase, sell, and grow through kindness and collaboration.

- Explore The Wall  
- Leave a Kindness Always spark  
- Follow the artist schedule and save a night  
- Get Involved — book space, partner, volunteer, or give  
- Visit Hacienda at 522 Clematis Street  

All proceeds raised go towards local arts, the artists, the venues, and local community events.

**Keywords:** art,gallery,west palm beach,kindness,nonprofit,local artists,hacienda  

**Support URL:** https://theartistpost.org/support  
**Privacy URL:** https://theartistpost.org/privacy  
**Marketing URL:** https://theartistpost.org  

## Privacy nutrition (App Store)

| Data | Collected | Linked to identity | Used for tracking |
|------|-----------|--------------------|-------------------|
| Email / name (Get Involved, subscribe) | Yes | Yes (operations) | No |
| Photos (optional Create upload) | Yes, if user uploads | No account yet | No |
| Product events (optional Pulse) | Yes, if configured | No | No |
| Device studio (likes, saves, notes) | On device only | No | No |
| Payments | Handled by PayPal / Bonfire | — | No |

## Review notes

- This is a 501(c)(3) community arts hub (EIN 85-2609788).  
- Donations open PayPal. Merch opens Bonfire.  
- Artist agreement remains the Google Form until accounts launch.  
- No invented artists or events.

## Screenshots still needed from Robbie

Apple wants 6.7" and 6.1" iPhone captures of Home, Explore, Kindness, Schedule, and Studio. Use the live site or TestFlight — do not mock fake artist portraits.
