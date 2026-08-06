"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { links, moreMenu, site } from "@/content/site";
import {
  staggerContainer,
  fadeUp,
  useMotionSafe,
} from "@/shared/motion/variants";

export default function MorePage() {
  const { initial, animate } = useMotionSafe();
  const socialEntries = Object.entries(links.social) as Array<[string, string]>;

  return (
    <motion.div
      className="px-4 py-6"
      variants={staggerContainer}
      initial={initial}
      animate={animate}
    >
      <motion.h1 variants={fadeUp} className="display text-3xl text-ink">
        More
      </motion.h1>
      <motion.p variants={fadeUp} className="mt-1 text-sm text-paper-muted">
        {site.legalName}
      </motion.p>

      <motion.ul variants={staggerContainer} className="mt-6 space-y-2">
        {moreMenu.map((item) => {
          const className =
            "flex items-center justify-between rounded-xl border border-line bg-surface-muted px-4 py-4 active:scale-[0.98] transition";
          const body = (
            <>
              <span>
                <span className="block font-semibold text-ink">
                  {item.label}
                </span>
                <span className="block text-xs text-paper-muted">
                  {item.description}
                </span>
              </span>
              <span className="text-paper-muted" aria-hidden>
                →
              </span>
            </>
          );

          if ("external" in item && item.external) {
            return (
              <motion.li key={item.href} variants={fadeUp}>
                <a
                  href={item.href}
                  className={className}
                  target={
                    item.href.startsWith("mailto:") ? undefined : "_blank"
                  }
                  rel={
                    item.href.startsWith("mailto:") ? undefined : "noreferrer"
                  }
                >
                  {body}
                </a>
              </motion.li>
            );
          }

          return (
            <motion.li key={item.href} variants={fadeUp}>
              <Link href={item.href} className={className}>
                {body}
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>

      <motion.section variants={fadeUp} className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-paper-muted">
          Social
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {socialEntries.map(([key, href]) => (
            <li key={key}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize text-ink"
              >
                {key === "x" ? "X" : key}
              </a>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.p
        variants={fadeUp}
        className="mt-10 text-center text-[11px] text-paper-muted"
      >
        {site.copyright}
      </motion.p>
    </motion.div>
  );
}
