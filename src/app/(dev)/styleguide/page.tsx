"use client";

import { Accordion } from "@/design-system/primitives/Accordion";
import { Button, ButtonLink } from "@/design-system/primitives/Button";
import { Card } from "@/design-system/primitives/Card";
import { Chip } from "@/design-system/primitives/Chip";
import { Skeleton, SkeletonCard } from "@/design-system/primitives/Skeleton";
import { Tabs } from "@/design-system/primitives/Tabs";
import { useToast } from "@/design-system/primitives/Toast";
import { tokens } from "@/design-system/tokens";
import { useState } from "react";

function ToastDemo() {
  const { push } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() =>
        push({
          title: "Spark sent",
          description: "Your kindness note is on the wall.",
          tone: "success",
        })
      }
    >
      Trigger toast
    </Button>
  );
}

export default function StyleguidePage() {
  const [tab, setTab] = useState("list");
  const [chip, setChip] = useState("all");

  return (
    <div className="mx-auto max-w-[var(--content-max)] space-y-16 px-4 py-16 sm:px-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-spark-teal">
          Dev only
        </p>
        <h1 className="display mt-2 text-4xl text-paper sm:text-5xl">
          Design system
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-paper-muted">
          Tokens and primitives for The Artist Post. Prefer CSS variables in
          markup; use <code className="text-spark-gold">@/design-system</code>{" "}
          for JS motion and typed exports.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Color</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(tokens.colors).map(([name, value]) => (
            <div key={name} className="rounded-xl border border-line p-3">
              <div
                className="mb-2 h-12 rounded-lg border border-line"
                style={{ background: value }}
              />
              <p className="text-xs font-semibold text-paper">{name}</p>
              <p className="text-[10px] text-paper-muted">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Typography</h2>
        <p className="display text-4xl text-paper">Clash Display — headline</p>
        <p className="text-base text-paper-muted">
          Jost — body copy for mission, schedule, and kindness notes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary" magnetic>
            Secondary magnetic
          </Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <ButtonLink href="/explore" variant="onDark" className="rounded-full">
            Link
          </ButtonLink>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Chips & Tabs</h2>
        <div className="flex flex-wrap gap-2">
          {["all", "music", "visual"].map((id) => (
            <Chip
              key={id}
              label={id}
              active={chip === id}
              role="radio"
              aria-checked={chip === id}
              onClick={() => setChip(id)}
            />
          ))}
        </div>
        <Tabs
          label="Demo view"
          value={tab}
          onChange={setTab}
          items={[
            { id: "list", label: "List" },
            { id: "calendar", label: "Calendar" },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Card / Skeleton / Accordion</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-paper">Glass card surface</p>
          </Card>
          <SkeletonCard />
          <Skeleton className="h-40" />
        </div>
        <Accordion
          defaultOpenId="a1"
          items={[
            {
              id: "a1",
              title: (
                <span className="display text-xl text-paper">Accordion one</span>
              ),
              subtitle: "Expandable region",
              content: (
                <p className="text-sm text-paper-muted">
                  Used on Artist Schedule event details.
                </p>
              ),
            },
            {
              id: "a2",
              title: (
                <span className="display text-xl text-paper">Accordion two</span>
              ),
              content: <p className="text-sm text-paper-muted">Second panel.</p>,
            },
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl text-paper">Toast</h2>
        <ToastDemo />
      </section>
    </div>
  );
}
