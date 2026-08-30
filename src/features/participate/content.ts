import { copy, links } from "@/content/site";

/** Partnership paths from existing mission copy — no invented prices. */
export const partnerPackages = [
  {
    id: "venue",
    title: "Open a room",
    kicker: "Venues",
    body: "If you have a storefront, a stage, or a corner on Clematis, TAP activates it with artists — free showcase space, not a service stack.",
    href: "mailto:Robbie@theartistpost.org?subject=Partnership%20%E2%80%94%20venue",
    cta: "Email Robbie",
  },
  {
    id: "sponsor",
    title: "Sponsor a night",
    kicker: "Sponsors",
    body: "Underwrite a Hacienda evening so local creatives can be seen without a ticket price standing in the way.",
    href: "mailto:Robbie@theartistpost.org?subject=Partnership%20%E2%80%94%20sponsor%20a%20night",
    cta: "Offer a night",
  },
  {
    id: "chapter",
    title: "Launch a chapter",
    kicker: "Cities",
    body: copy.supporters.applyBody,
    href: "/supporters",
    cta: copy.supporters.applyCta,
  },
] as const;

/** Honest fund lines from the live mission — no invented dollar splits. */
export const whatThisFunds = [
  {
    id: "space",
    title: "The live room",
    body: "Keeps Hacienda on Clematis open as a free showcase — rotating work, donation-based merch, a place to meet.",
  },
  {
    id: "artists",
    title: "Artists, not barriers",
    body: "Showcase space stays free. Kindness and collaboration are the cost of entry.",
  },
  {
    id: "events",
    title: "Community nights",
    body: copy.about.proceeds,
  },
  {
    id: "home",
    title: "A permanent home",
    body: copy.about.supportBody,
  },
] as const;

export const giveActions = [
  { id: "paypal", href: links.donate, label: "Donate with PayPal", external: true },
  { id: "merch", href: links.merch, label: "Shop Kindness Always", external: true },
] as const;

export const volunteerMissions = [
  {
    id: "hold-space",
    title: "Hold space at showcases",
    body: "Be in the room at Hacienda — welcome visitors, watch the work, keep the night kind.",
  },
  {
    id: "welcome",
    title: "Welcome at the door",
    body: "First faces at 522 Clematis. Point people toward the wall, the merch table, and the artists.",
  },
  {
    id: "sparks",
    title: "Tend the kindness wall",
    body: "Leave a spark, read notes aloud, help visitors pin a word to a night or a frame.",
  },
  {
    id: "chapter",
    title: "Help a chapter stand up",
    body: "If TAP is forming in your city, help gather venues, artists, and a first kindness night.",
  },
] as const;
