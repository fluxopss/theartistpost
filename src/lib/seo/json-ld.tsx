import { assets, houseSchedule, links, site } from "@/content/site";
import { openingHoursSpecification } from "@/lib/hours";
import { SITE_URL } from "@/shared/lib/constants";
import type { ContentEvent } from "@/lib/content";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NonprofitOrganization",
    name: site.legalName,
    alternateName: site.mark,
    url: SITE_URL,
    email: site.email,
    telephone: site.phone,
    taxID: site.ein,
    foundingDate: site.foundedMonth,
    founder: {
      "@type": "Person",
      name: site.founder,
    },
    logo: `${SITE_URL.replace(/\/$/, "")}${assets.logo3d}`,
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.line1,
        addressLocality: site.address.city,
        addressRegion: site.address.state,
        addressCountry: site.address.country,
      },
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.line1,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      addressCountry: site.address.country,
    },
    location: {
      "@type": "Place",
      name: "The Artist Post at Hacienda",
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.line1,
        addressLocality: site.address.city,
        addressRegion: site.address.state,
        addressCountry: site.address.country,
      },
      openingHoursSpecification: openingHoursSpecification(houseSchedule),
    },
    sameAs: Object.values(links.social),
    slogan: site.tagline,
  };
}

type EventSponsor = {
  name: string;
  url: string | null;
  logoUrl: string | null;
} | null;

export function eventJsonLd(
  event: ContentEvent & { cancelled?: boolean; presentedBy?: EventSponsor },
) {
  const sponsor = event.presentedBy;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.start,
    endDate: event.end,
    eventStatus: event.cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.line1,
        addressLocality: site.address.city,
        addressRegion: site.address.state,
        addressCountry: site.address.country,
      },
    },
    organizer: {
      "@type": "NonprofitOrganization",
      name: site.legalName,
      taxID: site.ein,
      url: SITE_URL,
    },
    ...(!event.comingSoon && event.artist.trim().toUpperCase() !== "TBA"
      ? {
          performer: {
            "@type": "PerformingGroup",
            name: event.artist,
          },
        }
      : {}),
    ...(sponsor
      ? {
          sponsor: {
            "@type": "Organization",
            name: sponsor.name,
            ...(sponsor.url ? { url: sponsor.url } : {}),
            ...(sponsor.logoUrl ? { logo: sponsor.logoUrl } : {}),
          },
        }
      : {}),
  };
}

/**
 * JSON for a <script> tag. Escapes `<` (so no value can close the tag or open
 * an HTML comment) and U+2028/U+2029; the result still parses to the same data.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
