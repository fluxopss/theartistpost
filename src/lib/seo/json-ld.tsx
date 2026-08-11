import { links, site } from "@/content/site";
import { SITE_URL } from "@/shared/lib/constants";
import type { ContentEvent } from "@/lib/content";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NonprofitOrganization",
    name: site.legalName,
    alternateName: site.name,
    url: SITE_URL,
    email: site.email,
    telephone: site.phone,
    taxID: site.ein,
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
    sameAs: Object.values(links.social),
  };
}

export function eventJsonLd(event: ContentEvent) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.start,
    endDate: event.end,
    eventStatus: event.comingSoon
      ? "https://schema.org/EventScheduled"
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
    performer: {
      "@type": "PerformingGroup",
      name: event.artist,
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
