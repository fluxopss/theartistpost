import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles information on the web app and future App Store build.`,
};

export default function PrivacyPage() {
  return (
    <LegalLayout kicker="Legal" title="Privacy Policy">
      <p>Last updated August 28, 2026.</p>
      <p>
        {site.legalName} ({site.nonprofitLine} EIN {site.ein}) operates The
        Artist Post at {site.address.full}. Contact{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a> or{" "}
        <a href={`tel:${site.phoneTel}`}>{site.phone}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Get Involved and subscribe.</strong> Name, email, optional
          phone, city, and the message you write. These are sent to our
          operations webhook (GoHighLevel) when it is configured so Robbie can
          follow up.
        </li>
        <li>
          <strong>On this device.</strong> Studio name, likes, saved works and
          nights, kindness notes, comments, theme, and motion preference stay in
          your browser storage. They are not uploaded until artist accounts
          exist.
        </li>
        <li>
          <strong>Donations and merch.</strong> PayPal and Bonfire process those
          payments. We do not see card numbers.
        </li>
        <li>
          <strong>Optional analytics.</strong> If a Pulse key is configured, we
          record anonymous product events such as Donate or Get Involved taps.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <p>
        We do not sell personal information. We do not run a public account
        system yet — a “Studio Guest” name is local only. We do not invent
        artists, testimonials, or chapter leads.
      </p>

      <h2>Children</h2>
      <p>
        The app is a community arts hub, not directed at children under 13. Do
        not submit personal information for a child under 13.
      </p>

      <h2>Your choices</h2>
      <p>
        Clear local studio data in Settings. Email Robbie to ask us to delete a
        Get Involved or subscribe record. You can install or uninstall the web
        app at any time.
      </p>

      <h2>App Store build</h2>
      <p>
        The iOS wrapper loads this same site. It does not add extra trackers.
        Camera or photo library access is only used if you choose an image in
        Create. Push notifications are not active until we ship a native
        reminder feature and ask permission.
      </p>
    </LegalLayout>
  );
}
