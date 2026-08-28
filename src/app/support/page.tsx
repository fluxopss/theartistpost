import type { Metadata } from "next";
import { links, site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help with ${site.name} — visit, call, or email Robbie.`,
};

export default function SupportPage() {
  return (
    <LegalLayout kicker="Help" title="Support">
      <p>
        Robbie reads the inbox. Better yet, see us in person at Hacienda during
        posted hours ({site.hoursToday}).
      </p>
      <ul>
        <li>
          Email <a href={`mailto:${site.email}`}>{site.email}</a>
        </li>
        <li>
          Call or text <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
        </li>
        <li>
          Visit{" "}
          <a href={site.mapsUrl} target="_blank" rel="noreferrer">
            {site.address.full}
          </a>
        </li>
      </ul>

      <h2>How do I showcase?</h2>
      <p>
        Open Get Involved, choose a door, and sign the{" "}
        <a href={links.artistAgreement} target="_blank" rel="noreferrer">
          artist agreement
        </a>
        . After approval you receive a scheduling link.
      </p>

      <h2>How do I install the app?</h2>
      <p>
        On iPhone: Share → Add to Home Screen. On Android: use the Install
        banner or the browser menu. The App Store binary is this same web app in
        a native wrapper.
      </p>

      <h2>Donations and merch</h2>
      <p>
        Donate via <a href={links.donate}>PayPal</a> or Venmo {site.venmo}. Order
        Kindness Always merch on{" "}
        <a href={links.merch} target="_blank" rel="noreferrer">
          Bonfire
        </a>{" "}
        or call to place an order.
      </p>
    </LegalLayout>
  );
}
