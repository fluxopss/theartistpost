import { createHash } from "node:crypto";
import { content } from "@/lib/content";
import { hours, links, site, socialLabels, type SocialNetwork } from "@/content/site";
import {
  toChapterDTO,
  toContentArtistDTO,
  type ChapterDTO,
  type ContentArtistDTO,
} from "@/server/api/dto";
import { absoluteUrl, externalUrl } from "@/server/api/urls";

export type BootstrapPayload = {
  contact: {
    email: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      state: string;
      country: string;
      full: string;
    };
    mapsUrl: string;
  };
  hours: {
    openMinutes: number;
    closeMinutes: number;
    label: string;
    timeZone: string;
  };
  social: Array<{ id: SocialNetwork; label: string; url: string }>;
  donate: {
    paypalUrl: string;
    paypalMonthlyUrl: string;
    pageUrl: string;
    venmo: string;
  };
  merchUrl: string;
  artistAgreementUrl: string;
  chapters: ChapterDTO[];
  artists: ContentArtistDTO[];
};

export type Bootstrap = { contentVersion: string } & BootstrapPayload;

/** Short, stable fingerprint of the payload — changes only when content does. */
export function contentVersionOf(payload: BootstrapPayload): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
}

function url(value: string): string {
  // Every link here is an absolute https URL in site.ts; fail loudly if not.
  const resolved = externalUrl(value);
  if (!resolved) throw new Error(`Expected an absolute URL, got "${value}"`);
  return resolved;
}

/** In-house path (`/donate`) → absolute origin URL for native clients. */
function sitePageUrl(path: string): string {
  const resolved = absoluteUrl(path);
  if (!resolved) throw new Error(`Expected a site path, got "${path}"`);
  return resolved;
}

/** Everything the app needs on first launch, from site.ts + the content layer. */
export async function buildBootstrap(): Promise<Bootstrap> {
  const [chapters, artists] = await Promise.all([
    content.getChapters(),
    content.getArtists(),
  ]);

  const payload: BootstrapPayload = {
    contact: {
      email: site.email,
      phone: site.phone,
      address: {
        line1: site.address.line1,
        city: site.address.city,
        state: site.address.state,
        country: site.address.country,
        full: site.address.full,
      },
      mapsUrl: url(site.mapsUrl),
    },
    hours: {
      openMinutes: hours.openMinutes,
      closeMinutes: hours.closeMinutes,
      label: hours.label,
      timeZone: hours.timeZone,
    },
    social: (Object.keys(links.social) as SocialNetwork[]).map((id) => ({
      id,
      label: socialLabels[id],
      url: url(links.social[id]),
    })),
    donate: {
      paypalUrl: url(links.donate),
      paypalMonthlyUrl: url(links.donateMonthly),
      pageUrl: sitePageUrl(links.donatePage),
      venmo: site.venmo,
    },
    merchUrl: url(links.merch),
    artistAgreementUrl: url(links.artistAgreement),
    chapters: chapters.map(toChapterDTO),
    artists: artists.map(toContentArtistDTO),
  };

  return { contentVersion: contentVersionOf(payload), ...payload };
}
