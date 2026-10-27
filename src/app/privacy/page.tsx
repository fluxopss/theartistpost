import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles information on the website and in the app.`,
};

export default function PrivacyPage() {
  return (
    <LegalLayout kicker="Legal" title="Privacy Policy">
      <p className="font-semibold text-paper">Last updated October 27, 2026</p>
      <p>
        {site.legalName} ({site.nonprofitLine} EIN {site.ein}) operates The
        Artist Post at {site.address.full}. This page explains, in plain words,
        what the website and the app keep and why. Questions:{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a> or{" "}
        <a href={`tel:${site.phoneTel}`}>{site.phone}</a>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>
          <strong>Joining and signing in.</strong> We keep your name and email
          address. There is no password: we email you a short sign-in code,
          which expires after 10 minutes. We keep the code only in scrambled
          form so it cannot be read back. Once you are in, the site keeps you
          signed in with a secure cookie, and the app with a sign-in token on
          your phone.
        </li>
        <li>
          <strong>Your profile.</strong> Anything you add to your profile is
          shown to other people on The Artist Post: your name, handle, photo,
          bio, headline, the city or area you type in, the art you are into,
          and your chapter. Artists can also add links to their own sites and
          social accounts, and optional Venmo, Cash App or PayPal.me usernames
          so people can tip them directly. We never see or handle those
          payments.
        </li>
      </ul>

      <h2>What you share</h2>
      <ul>
        <li>
          <strong>Posts, replies and photos.</strong> Work artists publish to
          The Wall, posts and replies on the community board, photos you
          attach, comments, reactions and who you follow are visible to other
          people, because that is the point of sharing them.
        </li>
        <li>
          <strong>Keeping it kind.</strong> If you block someone, we keep that
          so you stop seeing each other. If you report something, we keep the
          report, the reason and any note you add so the house team can review
          it. We keep a record of account actions (such as posting, removing a
          post or a moderation decision) to keep the community safe.
        </li>
        <li>
          <strong>Notifications.</strong> When someone follows you, comments,
          reacts or an event you are going to changes, we keep a notification
          for you to see in the app.
        </li>
      </ul>

      <h2>Events</h2>
      <ul>
        <li>
          <strong>RSVPs.</strong> When you RSVP to a night we keep your answer,
          how many people are coming, any note you add, and your place on a
          waitlist if the night is full. The house team can see the list for
          the nights they run.
        </li>
        <li>
          <strong>Check in.</strong> At a night you can tap to check in. If you
          choose to share your location, your phone&apos;s reading is compared
          with the venue in that moment and then dropped: your coordinates are
          never stored. We keep only the time you checked in and whether you
          were near the venue.
        </li>
      </ul>

      <h2>Forms and newsletter</h2>
      <p>
        Get Involved, the newsletter sign-up, holding a seat and donor
        follow-up send your name, email, optional phone and city, and the
        message you write to our CRM (GoHighLevel) so Robbie and the team can
        follow up.
      </p>

      <h2>On this device</h2>
      <p>
        Your theme, motion setting, saved nights and works, studio name and
        kindness notes you leave on this device stay in your browser or phone
        storage. You can clear them in Settings.
      </p>

      <h2>Donations and merch</h2>
      <p>
        PayPal and Bonfire process those payments. We do not see card numbers.
      </p>

      <h2>Analytics</h2>
      <p>
        When it is switched on, we count simple, anonymous product events such
        as Donate or Get Involved taps to learn what helps people find the
        house.
      </p>

      <h2>Advertising</h2>
      <p>
        To help keep showcase and vending opportunities free for artists, this
        site may show ads from Google. When it does, Google and its partners may
        use cookies to serve ads based on your visits to this and other sites.
        You can turn off personalized ads in{" "}
        <a href="https://adssettings.google.com" rel="noreferrer">
          Google Ads Settings
        </a>{" "}
        and read how Google uses this information at{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          rel="noreferrer"
        >
          policies.google.com
        </a>
        . Ads never change what is free: artists are never charged to take part.
      </p>

      <h2>What we do not do</h2>
      <p>
        We do not sell personal information. We do not invent artists,
        testimonials, or chapter leads.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          Edit or remove anything on your profile at any time in Settings.
        </li>
        <li>
          You can <Link href="/delete-account">delete your account</Link>{" "}
          yourself, on the website or in the app. That removes your account,
          profile, posts, replies, comments, reactions, follows, RSVPs and
          check-ins. We keep a short internal note that an account was deleted,
          without your email address in readable form, and our safety log
          refers to past actions by an account number only. Email us if you
          also want photo files you uploaded cleared from our storage.
        </li>
        <li>
          Email Robbie to ask us to remove a Get Involved, newsletter or seat
          request record from our CRM.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        The Artist Post is a community arts hub, not directed at children under
        13. Do not submit personal information for a child under 13.
      </p>

      <h2>The app</h2>
      <p>
        The Artist Post app uses the same account, the same rules and this same
        policy. It asks for camera or photo access only when you choose to add
        a photo, and for location only when you choose to check in at a night.
      </p>
    </LegalLayout>
  );
}
