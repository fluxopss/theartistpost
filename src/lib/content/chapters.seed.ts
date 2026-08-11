import type { ContentChapter } from "./schemas";

/**
 * Known expansion regions from site copy — no invented contacts/leads.
 * Replace with real chapter records when the nonprofit provides them.
 */
export const chapters: ContentChapter[] = [
  {
    id: "fl-wpb",
    name: "West Palm Beach",
    state: "Florida",
    stateCode: "FL",
    city: "West Palm Beach",
    status: "active",
    summary:
      "Home hub at Hacienda · 522 Clematis Street — showcases, merch, and Kindness Always.",
  },
  {
    id: "ok",
    name: "Oklahoma",
    state: "Oklahoma",
    stateCode: "OK",
    status: "active",
    summary: "Legal presence established (IRS determination on file).",
  },
  {
    id: "id",
    name: "Idaho",
    state: "Idaho",
    stateCode: "ID",
    status: "forming",
    summary: "Chapter region on the national map — local leadership TBD.",
  },
  {
    id: "nv",
    name: "Nevada",
    state: "Nevada",
    stateCode: "NV",
    status: "forming",
    summary: "Chapter region on the national map — local leadership TBD.",
  },
  {
    id: "tn",
    name: "Tennessee",
    state: "Tennessee",
    stateCode: "TN",
    status: "planned",
    summary: "Expansion target — apply to start a chapter.",
  },
  {
    id: "wa",
    name: "Washington",
    state: "Washington",
    stateCode: "WA",
    status: "planned",
    summary: "Expansion target — apply to start a chapter.",
  },
  {
    id: "tx",
    name: "Texas",
    state: "Texas",
    stateCode: "TX",
    status: "forming",
    summary: "Chapter region on the national map — local leadership TBD.",
  },
];
