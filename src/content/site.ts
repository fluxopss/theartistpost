/**
 * Canonical site content pulled from https://theartistpost.org/
 * Keep marketing copy here — not a CMS in v1.
 */

export const site = {
  name: "The Artist Post",
  mark: "The Artist Post®",
  legalName: "The Artist Post INC",
  nonprofitLine: "The Artist Post Inc. is a Nonprofit 501(c)(3) Organization.",
  ein: "85-2609788",
  venmo: "@theartistpost",
  kindnessMark: "Kindness Always®",
  shine: "BE KIND, SHINE BRIGHT!",
  tagline:
    "The Artist Post® connects artists, small businesses, and communities by providing free opportunities for local creatives to showcase, sell, and grow through kindness and collaboration.",
  headline: "Get Involved",
  heroSupport:
    "Free opportunities for local creatives to showcase, sell, and grow through kindness and collaboration.",
  metaDescription:
    "The Artist Post® connects artists, small businesses, and communities through free showcase space, kindness, and collaboration in West Palm Beach.",
  aboutMetaDescription:
    "Support local artists through our community-driven platform, dedicated to arts and culture advocacy.",
  twitterHandle: "@TheArtistPost",
  email: "Robbie@theartistpost.org",
  phone: "832-833-9100",
  phoneTel: "8328339100",
  address: {
    line1: "522 Clematis Street",
    city: "West Palm Beach",
    state: "FL",
    country: "USA",
    full: "522 Clematis Street, West Palm Beach, FL, USA",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=522+Clematis+Street+West+Palm+Beach+FL",
  hoursToday: "09:00 am – 09:30 pm",
  copyright: "Copyright © 2026 The Artist Post Inc - All Rights Reserved.",
} as const;

export const links = {
  donate:
    "https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=3DCYEFGX7GXMY",
  merch: "https://www.bonfire.com/love-all-51/",
  artistAgreement: "https://forms.gle/uS58nk2Bpgx45Uwv5",
  partnerSubCulture: "https://sub-culture.org/",
  social: {
    facebook: "https://www.facebook.com/TheArtistPost",
    instagram: "https://www.instagram.com/the_artist_post",
    linkedin: "https://www.linkedin.com/company/the-artist-post",
    pinterest: "https://www.pinterest.com/theartistpost/",
    tiktok: "https://www.tiktok.com/@the_artist_post",
    x: "https://www.x.com/TheArtistPost",
    youtube: "https://www.youtube.com/channel/UC7xnl70dDRjEg6bJt-W1FXw",
  },
} as const;

export const assets = {
  logo: "/brand/logo.webp",
  favicon: "/brand/favicon-64.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
  cover: "/brand/cover-opt.webp",
  coverOg: "/brand/cover-og.webp",
  hacienda: "/brand/hacienda.webp",
  haciendaSm: "/brand/hacienda-sm.webp",
  haciendaHero: "/brand/hacienda-hero.webp",
  comingSoon: "/brand/coming-soon.webp",
  aboutHero: "/brand/about-hero.webp",
  partnerSubCulture: "/brand/partner-subculture.webp",
  kindnessTrademark: "/brand/kindness-trademark.webp",
  loveAll: "/brand/love-all.webp",
  supportersMap: "/brand/supporters-map.webp",
  merchLockup: "/merch/tap-merch-site.webp",
  merchPhotos: [
    "/merch/img-1605.webp",
    "/merch/img-5690.webp",
    "/merch/gallery.webp",
  ],
  donations: "/brand/donations-appreciated.webp",
} as const;

/** Official TAP mantra from client trademark sheet. */
export const mantra = [
  { lead: "Love", rest: "ALL" },
  { lead: "Dream", rest: "TOGETHER" },
  { lead: "Create", rest: "AS ONE", mark: "™" },
] as const;

export const navMarketing = [
  { href: "/", label: "Home" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/artist-schedule", label: "Schedule" },
  { href: "/kindness-always", label: "Kindness Always" },
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
] as const;

export const navApp = [] as const;

/** @deprecated App tabs removed — site uses standard header nav. */
export const appTabs = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "explore" },
  { href: "/artist-schedule", label: "Schedule", icon: "schedule" },
  { href: "/kindness-always", label: "Merch", icon: "merch" },
  { href: "/about", label: "About", icon: "more" },
] as const;

export type AppTabIcon = (typeof appTabs)[number]["icon"];

/** More menu — secondary destinations */
export const moreMenu = [
  {
    href: "/get-involved",
    label: "Get Involved",
    description: "Showcase, partner, volunteer, give",
  },
  { href: "/about", label: "About", description: "Mission & nonprofit" },
  { href: "/supporters", label: "Supporters", description: "Chapters & legal" },
  { href: "/create", label: "Create", description: "Compose a scene" },
  {
    href: "mailto:Robbie@theartistpost.org",
    label: "Contact",
    description: "Email Robbie",
    external: true,
  },
  {
    href: "https://www.paypal.com/donate/?cmd=_s-xclick&hosted_button_id=3DCYEFGX7GXMY",
    label: "Donate",
    description: "Support local arts",
    external: true,
  },
] as const;

export const copy = {
  involve: {
    kicker: "Participation first",
    title: "Get Involved",
    lead: "The first move is not a purchase — it is showing up. Choose the door that fits you.",
    shine: site.shine,
    formTitle: "Tell us how you want to show up",
    formBody:
      "Robbie reads these. No account required. We will follow up about space, partnership, or volunteering.",
    success:
      "Received — thank you. If you booked space, keep the agreement tab open and we will send a scheduling link after approval.",
    spaceAgreement: "Review & sign the artist agreement",
    spaceAfter:
      "After the signed agreement is approved, you receive a scheduling link.",
  },
  home: {
    haciendaTitle: "The Artist Post @ The Hacienda",
    haciendaBody:
      "Step into our live creative space inside Hacienda, where local artists, community, and culture come together. Explore rotating artist showcases, donation-based merch, curated finds, and a space designed to connect, create, and grow. Every visit helps support our mission of building a permanent home for art in the future.",
    featuredTitle: "Featured Artists",
    featuredEmpty:
      "Featured artists coming soon. Visit us at Hacienda or check back as new showcases go live.",
    contactTitle: "Contact Us",
    contactLead: "Better yet, see us in person!",
    contactBody:
      "We love our community, so feel free to visit during normal business hours to check out our featured local artists and to obtain our merch!",
    dropLine: "Drop us a line!",
    getDirections: "Get directions",
    subscribeTitle: "Subscribe",
    subscribeBody: "Sign up to hear from us about specials, sales, and events.",
    socialTitle: "Social",
  },
  about: {
    title: "About",
    mission:
      "The Artist Post® is a community-driven platform dedicated to supporting and advocating for local artists and small businesses. We create real opportunities for creatives to be seen, heard, and supported, without the usual barriers. Through curated events, pop-up activations, and collaborative spaces, we connect artists directly with their communities. From showcasing original work to offering donation-based retail opportunities, our goal is to help artists turn their passion into visibility, connection, and growth.",
    proceeds:
      "All Proceeds Raised Go Towards Local Arts, the Artists, the Venues, and Local Community Events.",
    instagramCta: "Follow me on Instagram",
    donateCta: "Donate",
    partnerLabel: "Partner",
    marksKicker: "Registered marks",
    marksTitle: "The house has a name",
    marksBody:
      "The Artist Post®, Kindness Always®, and Love | ALL · Dream | TOGETHER · Create | AS ONE™ travel with the work. BE KIND, SHINE BRIGHT!",
    supportTitle: "Toward a permanent home",
    supportBody:
      "Your donations help keep our space going and build toward a physical location in the future. Every bit helps us grow closer to a permanent home for art and creativity.",
    liveRoomTitle: "The live room",
    liveRoomBody:
      "Hacienda on Clematis is where TAP meets people in the room — rotating showcases, donation-based merch, and a space built to connect.",
  },
  schedule: {
    title: "Artist Schedule",
    supportLine: "Come support our scheduled local artisans.",
    showcaseTitle: "Artisan Showcase",
    venue: "Hacienda",
    status: "Artist Schedule Coming Soon!",
    ready: "Ready to take the FIRST step?",
    step1: "STEP 1: Review & Sign The Agreement To Get Started!",
    step1Cta: "Get Started",
    step2Lead: "After Signed Agreement & Approval:",
    step2: "STEP 2: You Will Get Sent A Scheduling Link.",
  },
  kindness: {
    title: "Kindness Always / Merch",
    body: "Kindness Always isn’t about being perfect, it’s about being intentional. It’s a reminder that we all have our flaws, our off days, and our struggles, but we still have the power to choose kindness. When you wear it, you’re making that choice, to lead with compassion, to uplift others, and to move through life with purpose in everything you do.",
    orderLine: "Call/Text To Place An Order",
    merchBody:
      "The Artist Post merch and Kindness Always brand bring together art, community, and purpose. Each piece supports local creatives while representing a simple truth.. We may not be perfect, but we can always choose to lead with kindness.",
    buyCta: "Buy Merch",
  },
  supporters: {
    title: "Supporters",
    findTitle: "FIND The Artist Post",
    expansion:
      "The Artist Post is growing with the vision of operating nationwide. We believe every community deserves a hub where local artists are seen, supported, and celebrated.",
    launchTitle: "Launch a Local Chapter",
    wantTitle: "Want The Artist Post In Your City?",
    applyBody:
      "If you're interested in starting a chapter in your area, start by applying here and attaching your vision.",
    applyCta: "Submit Application",
    legalNote:
      "Certificates of legal operation are available upon request. Map regions include Oklahoma, Idaho, Nevada, Tennessee, Washington, Florida, and Texas.",
  },
} as const;
