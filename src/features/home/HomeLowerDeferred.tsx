"use client";

import dynamic from "next/dynamic";
import { LazyWhenVisible } from "@/components/LazyWhenVisible";

const HaciendaShowcase = dynamic(
  () =>
    import("@/components/HaciendaShowcase").then((m) => ({
      default: m.HaciendaShowcase,
    })),
  { ssr: false },
);

const ContactSocialSection = dynamic(
  () =>
    import("@/features/home/ContactSocialSection").then((m) => ({
      default: m.ContactSocialSection,
    })),
  { ssr: false },
);

export function HomeLowerDeferred() {
  return (
    <>
      <LazyWhenVisible minHeight={360}>
        <HaciendaShowcase />
      </LazyWhenVisible>
      <LazyWhenVisible minHeight={480}>
        <ContactSocialSection />
      </LazyWhenVisible>
    </>
  );
}
