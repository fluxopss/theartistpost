import type { Metadata } from "next";
import { links, site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms for using ${site.name} on the web and as an installed app.`,
};

export default function TermsPage() {
  return (
    <LegalLayout kicker="Legal" title="Terms of Use">
      <p>Last updated August 28, 2026.</p>
      <p>
        By using The Artist Post you agree to these terms. The house is operated
        by {site.legalName}, a 501(c)(3) organization (EIN {site.ein}), at{" "}
        {site.address.full}.
      </p>

      <h2>The house</h2>
      <p>
        This is a community platform for local artists, small businesses, and
        neighbors. Showcase space is free. Donations support local arts, artists,
        venues, and community events. They are processed by PayPal (
        <a href={links.donate}>donate</a>) and are not a purchase of goods from
        this app unless you order merch through Bonfire.
      </p>

      <h2>Your content</h2>
      <p>
        Kindness notes, comments, and Create drafts you make stay on this device
        unless you publish through a form we receive (Get Involved, artist
        agreement). Do not post anything unlawful, hateful, or that you do not
        have the right to share. We may remove material that breaks these terms
        or our mission of kindness.
      </p>

      <h2>Artist agreement</h2>
      <p>
        Booking physical space requires the official artist agreement. After it
        is approved, you receive a scheduling link. The Google Form remains the
        legal source of truth until accounts launch.
      </p>

      <h2>No warranties</h2>
      <p>
        Event listings marked coming soon are placeholders. Featured artists
        appear only when real portraits and bios are provided. The service is
        offered as-is.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${site.email}`}>{site.email}</a>. These terms
        are governed by the laws of the State of Florida.
      </p>
    </LegalLayout>
  );
}
