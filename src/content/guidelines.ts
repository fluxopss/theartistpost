/**
 * Community Guidelines, word for word from the app
 * (theartistpost-app src/content/legal.ts `guidelines`), so people agree to the
 * same text on the web and in the app.
 */
export type GuidelinesSection = { heading?: string; body: string[]; list?: "bullets" };

export const communityGuidelines: { title: string; sections: GuidelinesSection[] } = {
  title: "Community Guidelines",
  sections: [
    {
      body: [
        "The Artist Post is a community for artists, makers and neighbors. These guidelines cover the community board, Wall notes, replies, and profiles.",
      ],
    },
    {
      heading: "Be kind",
      body: [
        "Lift others up. Shout-outs, collab calls, kindness notes, and honest questions are welcome. Disagree with work without attacking the person who made it.",
      ],
    },
    {
      heading: "Not allowed",
      list: "bullets",
      body: [
        "Harassment, bullying, or threats",
        "Hate or discrimination",
        "Sexual content",
        "Spam, scams, or promotion dressed up as community",
        "Impersonating another person or an organization",
        "Anything you don’t have the right to share",
      ],
    },
    {
      heading: "Credit the artist",
      body: [
        "When you share someone’s work, credit them. Don’t present another artist’s work as your own.",
      ],
    },
    {
      heading: "Report, don’t retaliate",
      body: [
        "Use Report on anything that breaks these guidelines. Don’t argue in the comments or try to get even.",
      ],
    },
    {
      heading: "What happens next",
      body: [
        "The house team reviews reports within 24 hours. We may hide content, close reports, or suspend an account. A suspended account can still delete itself.",
      ],
    },
    {
      heading: "Artists never pay to take part",
      body: ["Posting on the community board, joining, and showing your work cost nothing."],
    },
  ],
};
