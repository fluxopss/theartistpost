import type { Metadata } from "next";
import { site } from "@/content/site";
import Link from "next/link";
import { LegalLayout } from "@/features/app/LegalLayout";
import { DeleteAccountForm } from "@/features/account/DeleteAccountForm";
import { getSession } from "@/features/auth/adapter";
import { joinHref } from "@/shared/lib/safeNext";

export const metadata: Metadata = {
  title: "Delete your account",
  description: `How to delete your ${site.name} account and what happens to your data.`,
};

export const dynamic = "force-dynamic";

export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await getSession();
  const done = !user && (await searchParams).done === "1";
  return (
    <LegalLayout kicker="Your data" title="Delete your account">
      <p>
        You can delete your {site.name} account yourself, any time, on this
        website or in the app. It takes less than a minute.
      </p>

      {done ? (
        <p role="status" className="rounded-2xl border border-spark-teal/40 bg-accent-soft p-4 text-paper">
          Your account is deleted. Thank you for being part of {site.name}. You
          are always welcome back.
        </p>
      ) : user ? (
        <>
          <h2>Delete it here</h2>
          <DeleteAccountForm />
        </>
      ) : (
        <>
          <h2>On the website</h2>
          <p>
            <Link href={joinHref("/delete-account")}>Sign in to delete it yourself</Link>{" "}
            with a code sent to your email, and you&apos;ll land right back here.
          </p>
        </>
      )}

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

      <h2>Can&apos;t sign in?</h2>
      <p>
        Email <a href={`mailto:${site.email}`}>{site.email}</a> from the address
        on your account and we will delete it for you.
      </p>
    </LegalLayout>
  );
}
