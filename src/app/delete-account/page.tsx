import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalLayout } from "@/features/app/LegalLayout";

export const metadata: Metadata = {
  title: "Delete your account",
  description: `How to delete your ${site.name} account and what happens to your data.`,
};

export default function DeleteAccountPage() {
  return (
    <LegalLayout kicker="Your data" title="Delete your account">
      <p>
        You can delete your {site.name} account yourself, any time, in the app.
        It takes less than a minute.
      </p>

      <h2>In the app</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Open the app and go to the <strong>You</strong> tab, then Settings.</li>
        <li>Choose <strong>Delete account</strong>.</li>
        <li>Type <strong>DELETE</strong> to confirm.</li>
      </ol>

      <h2>What is removed</h2>
      <ul>
        <li>Your profile, photo, bio and topics.</li>
        <li>Your follows and followers.</li>
        <li>Your community posts and replies, and the support you gave.</li>
        <li>Your notifications, blocks, and the reports you filed.</li>
        <li>Your comments and likes on the Wall, and any works you published.</li>
      </ul>
      <p>
        We keep a private audit record that an account was deleted. It holds
        only a one-way hash of the email address, never the address itself.
      </p>

      <h2>Can&apos;t open the app?</h2>
      <p>
        Email <a href={`mailto:${site.email}`}>{site.email}</a> from the address
        on your account and we will delete it for you.
      </p>
    </LegalLayout>
  );
}
