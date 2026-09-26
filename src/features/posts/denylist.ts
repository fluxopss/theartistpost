/** Seeded fiction and Studio Guest — never serve on public reads. */
export const DENIED_POST_SLUGS = [
  "midnight-filament",
  "soft-architectures",
  "archive-bloom",
  "orbit-studies",
  "signal-garden",
  "paper-tide",
] as const;

export const DENIED_AUTHOR_EMAILS = [
  "luna@theartistpost.org",
  "kai@theartistpost.org",
  "mira@theartistpost.org",
  "guest@theartistpost.org",
] as const;

const deniedSlugSet = new Set<string>(DENIED_POST_SLUGS);
const deniedEmailSet = new Set(
  DENIED_AUTHOR_EMAILS.map((email) => email.toLowerCase()),
);

export function isDeniedPostSlug(slug: string): boolean {
  return deniedSlugSet.has(slug);
}

export function isDeniedAuthorEmail(email: string): boolean {
  return deniedEmailSet.has(email.trim().toLowerCase());
}

/**
 * Public catalog filter: published only, no seed rows, no guest author,
 * and author ArtistProfile.approved = true when a profile exists.
 */
export function publicCatalogWhere() {
  return {
    status: "PUBLISHED" as const,
    slug: { notIn: [...DENIED_POST_SLUGS] },
    author: {
      email: { notIn: [...DENIED_AUTHOR_EMAILS] },
      artistProfile: { is: { approved: true } },
    },
  };
}
