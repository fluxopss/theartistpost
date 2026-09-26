"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { create } from "zustand";
import { z } from "zod";
import { createPostAction } from "@/features/posts/actions";
import { mediaGap, mediaKindLabel } from "@/features/posts/mediaRule";
import {
  assertPublishConfirmed,
  isReviewStep,
} from "@/features/posts/publishGate";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/design-system/primitives/Modal";
import { useToast } from "@/design-system/primitives/Toast";
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
  visibility: "DRAFT",
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
  z
    .object({
      mediaUrl: z.string(),
      mediaType: z.enum(["IMAGE", "VIDEO", "EMBED", "CANVAS"]),
    })
    .superRefine((value, ctx) => {
      const gap = mediaGap(value.mediaUrl);
      if (!gap) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: gap,
        path: ["mediaUrl"],
      });
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
  const { push: toast } = useToast();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

  function requestPublish() {
    if (!validateCurrent()) return;
    if (!isReviewStep(step, steps.length)) {
      setError("Finish the review step before publishing.");
      return;
    }
    setConfirmOpen(true);
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed");
        return;
      }
      draft.setField("mediaUrl", data.url);
      draft.setField("mediaType", "IMAGE");
      toast({
        title: "Image ready",
        description: "Preview attached — continue when you’re happy with it.",
        tone: "success",
      });
    } catch {
      setError("Upload failed — try again or paste a URL.");
    } finally {
      setUploading(false);
    }
  }

  function submitConfirmed() {
    const gate = assertPublishConfirmed(true);
    if (!gate.ok) {
      setError(gate.error ?? "Confirm before publishing.");
      return;
    }
    setConfirmOpen(false);
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
        toast({ title: "Couldn’t publish", description: result.error, tone: "danger" });
        return;
      }

      draft.reset();
      setPreview(null);
      setMessage("Post created — opening scene…");
      toast({
        title: draft.visibility === "PUBLISHED" ? "Published" : "Draft saved",
        description: "Opening your scene…",
        tone: "success",
      });
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

      <div className="rounded-2xl border border-line bg-surface p-4">
          {step === 0 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Name the scene</legend>
              <label className="block text-sm text-paper-muted">
                Title
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
                  value={draft.title}
                  onChange={(e) => draft.setField("title", e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Tags (comma separated)
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
                  value={draft.tags}
                  onChange={(e) => draft.setField("tags", e.target.value)}
                  placeholder="neon, motion"
                />
              </label>
              <label className="block text-sm text-paper-muted">
                Visibility
                <select
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
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
              <legend className="display mb-2 text-2xl">The work itself</legend>
              <p className="text-sm text-paper-muted">
                Photograph, video, or sound. A TAP post is the work, so this step needs a file or a link.
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What kind of work">
                {(
                  [
                    ["IMAGE", "Photograph"],
                    ["VIDEO", "Video"],
                    ["EMBED", "Sound"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={draft.mediaType === id}
                    className={cn(
                      "min-h-11 rounded-full px-4 text-base font-semibold",
                      draft.mediaType === id
                        ? "bg-spark-coral text-ink"
                        : "border border-line bg-surface-muted text-paper",
                    )}
                    onClick={() => {
                      draft.setField("mediaType", id);
                      if (id !== "IMAGE") {
                        draft.setField("mediaUrl", "");
                        setPreview(null);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.mediaType === "IMAGE" ? (
                <label className="block text-sm text-paper-muted">
                  Upload a photograph
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="mt-2 block w-full text-base text-paper file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-spark-teal file:px-4 file:py-2 file:text-sm file:font-semibold file:!text-[#020b1a]"
                    disabled={uploading || pending}
                    onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}
              {(preview || draft.mediaUrl) && draft.mediaType === "IMAGE" ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview || draft.mediaUrl}
                    alt="Upload preview"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
              {uploading ? (
                <p className="text-sm text-spark-teal" role="status">
                  Uploading…
                </p>
              ) : null}
              <label className="block text-sm text-paper-muted">
                {draft.mediaType === "VIDEO"
                  ? "Video link"
                  : draft.mediaType === "EMBED"
                    ? "Sound link"
                    : "Photograph link"}
                <input
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
                  value={draft.mediaUrl}
                  onChange={(e) => {
                    draft.setField("mediaUrl", e.target.value);
                    setPreview(null);
                  }}
                  placeholder={
                    draft.mediaType === "EMBED"
                      ? "https://… or /uploads/track.mp3"
                      : "https://… or /uploads/file"
                  }
                />
              </label>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="space-y-4">
              <legend className="display mb-2 text-2xl">Description</legend>
              <label className="block text-sm text-paper-muted">
                Story
                <textarea
                  className="mt-1 min-h-36 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
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
                  className="mt-1 w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-base text-paper"
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
                    {mediaKindLabel(draft.mediaType)}
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
        </div>

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
            onClick={requestPublish}
            disabled={pending}
            className="flex-[2]"
          >
            {pending ? "Publishing…" : "Review & publish"}
          </Button>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm publish"
        description="Nothing posts until you confirm. This cannot be undone from this screen."
      >
        <p className="text-sm text-paper-muted">
          Publish <strong className="text-paper">{draft.title}</strong> as{" "}
          {draft.visibility.toLowerCase()}?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Keep editing
          </Button>
          <Button variant="secondary" onClick={submitConfirmed} disabled={pending}>
            {pending ? "Publishing…" : "Yes, publish"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
