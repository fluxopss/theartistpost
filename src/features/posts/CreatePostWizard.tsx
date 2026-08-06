"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";
import { z } from "zod";
import { createPostAction } from "@/features/posts/actions";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

type Draft = {
  title: string;
  tags: string;
  visibility: "DRAFT" | "PUBLISHED";
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "EMBED" | "CANVAS";
  description: string;
  primaryColor: string;
  layoutStyle: "framed" | "bleed" | "stack" | "orbit";
};

type DraftStore = Draft & {
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  reset: () => void;
};

const initial: Draft = {
  title: "",
  tags: "",
  visibility: "PUBLISHED",
  mediaUrl: "",
  mediaType: "IMAGE",
  description: "",
  primaryColor: "#031a37",
  layoutStyle: "framed",
};

const useDraftStore = create<DraftStore>((set) => ({
  ...initial,
  setField: (key, value) => set({ [key]: value }),
  reset: () => set(initial),
}));

const steps = [
  { id: "info", label: "Basics" },
  { id: "media", label: "Media" },
  { id: "description", label: "Story" },
  { id: "visual", label: "Look" },
  { id: "review", label: "Review" },
] as const;

const stepSchemas = [
  z.object({
    title: z.string().min(2, "Title needs at least 2 characters"),
    tags: z.string().optional(),
    visibility: z.enum(["DRAFT", "PUBLISHED"]),
  }),
  z.object({
    mediaUrl: z
      .string()
      .url("Enter a valid media URL")
      .or(z.literal(""))
      .optional(),
    mediaType: z.enum(["IMAGE", "VIDEO", "EMBED", "CANVAS"]),
  }),
  z.object({
    description: z.string().max(4000).optional(),
  }),
  z.object({
    primaryColor: z.string().optional(),
    layoutStyle: z.enum(["framed", "bleed", "stack", "orbit"]),
  }),
  z.object({}),
];

export function CreatePostWizard() {
  const draft = useDraftStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tagList = useMemo(
    () =>
      draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [draft.tags],
  );

  function validateCurrent() {
    const schema = stepSchemas[step];
    const result = schema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check this step");
      return false;
    }
    setError(null);
    return true;
  }

  function next() {
    if (!validateCurrent()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    if (!validateCurrent()) return;
    startTransition(async () => {
      const result = await createPostAction({
        title: draft.title,
        tags: tagList,
        visibility: draft.visibility,
        mediaUrl: draft.mediaUrl,
        mediaType: draft.mediaType,
        description: draft.description,
        primaryColor: draft.primaryColor,
        layoutStyle: draft.layoutStyle,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      draft.reset();
      if (result.mode === "fixture") {
        setMessage(
          result.message ??
            "Draft accepted locally. Connect Postgres to persist and open the post.",
        );
        return;
      }
      setMessage("Post created — opening scene…");
      router.push(`/post/${result.slug}`);
    });
  }

  return (
    <div className="pb-24">
      <ol className="mb-5 flex flex-wrap gap-1.5" aria-label="Create steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              i === step
                ? "bg-ink text-paper-on-dark"
                : i < step
                  ? "bg-spark-teal/20 text-ink"
                  : "bg-surface-muted text-paper-muted",
            )}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.28 }}
          className="rounded-2xl border border-line bg-surface p-4"
        >
          {step === 0 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Name the scene</legend>
              <label className="block text-sm text-paper-muted">
                Title
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.title}
                  onChange={(e) => draft.setField("title", e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Tags (comma separated)
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.tags}
                  onChange={(e) => draft.setField("tags", e.target.value)}
                  placeholder="neon, motion"
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Visibility
                <select
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.visibility}
                  onChange={(e) =>
                    draft.setField(
                      "visibility",
                      e.target.value as Draft["visibility"],
                    )
                  }
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </label>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Media</legend>
              <p className="text-sm text-paper-muted">
                URL / embed for now — file upload comes later.
              </p>
              <label className="block text-sm text-paper-muted">
                Media URL
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.mediaUrl}
                  onChange={(e) => draft.setField("mediaUrl", e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Type
                <select
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.mediaType}
                  onChange={(e) =>
                    draft.setField(
                      "mediaType",
                      e.target.value as Draft["mediaType"],
                    )
                  }
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="EMBED">Embed</option>
                  <option value="CANVAS">Canvas</option>
                </select>
              </label>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Description</legend>
              <label className="block text-sm text-paper-muted">
                Story
                <textarea
                  className="mt-1 min-h-36 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.description}
                  onChange={(e) =>
                    draft.setField("description", e.target.value)
                  }
                />
              </label>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Visual options</legend>
              <label className="block text-sm text-paper-muted">
                Accent color
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded-md border border-line bg-surface-muted"
                  value={draft.primaryColor}
                  onChange={(e) =>
                    draft.setField("primaryColor", e.target.value)
                  }
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Layout style
                <select
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-ink"
                  value={draft.layoutStyle}
                  onChange={(e) =>
                    draft.setField(
                      "layoutStyle",
                      e.target.value as Draft["layoutStyle"],
                    )
                  }
                >
                  <option value="framed">Framed</option>
                  <option value="bleed">Bleed</option>
                  <option value="stack">Stack</option>
                  <option value="orbit">Orbit</option>
                </select>
              </label>
            </fieldset>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3">
              <h2 className="display text-2xl">Review</h2>
              <dl className="space-y-2 text-sm text-paper-muted">
                <div>
                  <dt className="text-paper">Title</dt>
                  <dd>{draft.title}</dd>
                </div>
                <div>
                  <dt className="text-paper">Tags</dt>
                  <dd>{tagList.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-paper">Media</dt>
                  <dd>
                    {draft.mediaType}
                    {draft.mediaUrl ? ` · ${draft.mediaUrl}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-paper">Look</dt>
                  <dd>
                    {draft.layoutStyle} · {draft.primaryColor}
                  </dd>
                </div>
                <div>
                  <dt className="text-paper">Description</dt>
                  <dd className="whitespace-pre-wrap">
                    {draft.description || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 text-sm text-success" role="status">
              {message}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div
        className="fixed inset-x-0 z-40 mx-auto flex w-full max-w-[var(--app-frame-max)] gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md md:left-1/2 md:-translate-x-1/2"
        style={{
          bottom: "calc(var(--tab-bar-height) + var(--safe-bottom))",
        }}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0 || pending}
          className="flex-1"
        >
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={next} className="flex-[2]">
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-[2]"
          >
            {pending ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>
    </div>
  );
}
