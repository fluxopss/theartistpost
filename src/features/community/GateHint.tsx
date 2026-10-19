import Link from "next/link";
import type { CommunityGate } from "@/features/community/gate";
import { joinHref } from "@/shared/lib/safeNext";

/** What to say when someone tries to take part but can't yet. */
export function GateHint({ gate, here, action }: { gate: CommunityGate; here?: string; action: string }) {
  if (gate === "ready") return null;
  return (
    <p role="status" className="text-xs text-paper-muted">
      {gate === "signedOut" ? (
        <>
          <Link href={joinHref(here ?? "/community")} className="font-semibold text-spark-teal underline">
            Sign in
          </Link>{" "}
          to {action}.
        </>
      ) : gate === "needsProfile" ? (
        <>
          One step first:{" "}
          <Link href="/settings/profile" className="font-semibold text-spark-teal underline">
            Finish your profile
          </Link>{" "}
          (pick a handle and agree to the Community Guidelines), then {action}.
        </>
      ) : (
        <>Your account is paused, so you can read the board but not {action} right now.</>
      )}
    </p>
  );
}
