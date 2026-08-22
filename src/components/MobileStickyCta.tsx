import Link from "next/link";
import { Phone } from "lucide-react";
import { site } from "@/content/site";
import { TrackClick } from "@/components/TrackClick";

/** Equal-weight conversion on small screens: Call + Get Involved. */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <div className="flex gap-2">
        <TrackClick event="cta_call" payload={{ source: "mobile-sticky" }}>
          <a
            href={`tel:${site.phoneTel}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line-on-dark text-sm font-semibold text-paper-on-dark"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
        </TrackClick>
        <TrackClick event="cta_involve" payload={{ source: "mobile-sticky" }}>
          <Link
            href="/get-involved"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-spark-coral text-sm font-semibold text-ink"
          >
            Get Involved
          </Link>
        </TrackClick>
      </div>
    </div>
  );
}
