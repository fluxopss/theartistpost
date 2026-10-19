"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { TopicDTO } from "@/server/api/topics";
import { webApi } from "@/features/account/webApi";
import { GateHint } from "@/features/community/GateHint";
import {
  COMMUNITY_BODY_MAX,
  COMMUNITY_KINDS,
  validateCommunityBody,
  type CommunityKind,
} from "@/features/community/domain/compose";
import { graphemeLength } from "@/shared/lib/graphemes";
import { IMAGE_MAX_BYTES } from "@/shared/lib/limits";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/**
 * Post to the board, like the app: pick a kind (its prompt guides the words),
 * up to 500 characters, an optional topic and one photo. Nothing typed is lost
 * when something fails.
 */
export function Composer({ topics }: { topics: TopicDTO[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<CommunityKind>("SHOUTOUT");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const option = COMMUNITY_KINDS.find((k) => k.id === kind) ?? COMMUNITY_KINDS[0]!;
  const count = graphemeLength(body.trim());
  const check = validateCommunityBody(body);

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Photos must be images (JPEG, PNG, WebP or GIF).");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError("Image must be under 2.5MB.");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhoto(null);
    setPreview(null);
  }

  async function post(event: React.FormEvent) {
    event.preventDefault();
    if (!check.ok || busy) return;
    setBusy(true);
    setError(null);

    let imageUrl: string | undefined;
    if (photo) {
      const form = new FormData();
      form.set("file", photo);
      const uploaded = await webApi<{ url: string }>("/community/media", { method: "POST", form });
      if (!uploaded.ok) {
        setBusy(false);
        if (uploaded.status === 403 && uploaded.error.code === "forbidden") setNeedsProfile(true);
        else setError(uploaded.error.fields?.file ?? uploaded.error.message);
        return;
      }
      imageUrl = uploaded.data.url;
    }

    const result = await webApi<{ id: string }>("/community", {
      method: "POST",
      json: { kind, body: check.body, ...(topic ? { topicSlug: topic } : {}), ...(imageUrl ? { imageUrl } : {}) },
    });
    setBusy(false);
    if (!result.ok) {
      if (result.status === 403 && result.error.code === "forbidden") setNeedsProfile(true);
      else if (result.status === 429) setError("Try again in a moment.");
      else setError(result.error.fields?.body ?? result.error.fields?.imageUrl ?? result.error.message);
      return;
    }
    router.push(`/community/${result.data.id}`);
  }

  return (
    <form onSubmit={post} className="space-y-6" noValidate>
      <fieldset>
        <legend className="text-xs font-semibold text-paper-muted">Kind of post</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {COMMUNITY_KINDS.map((k) => (
            <label
              key={k.id}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-spark-teal",
                kind === k.id ? "border-spark-teal bg-accent-soft text-spark-teal" : "border-line text-paper-muted hover:text-paper",
              )}
            >
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="community-body" className="text-xs font-semibold text-paper-muted">
          Your post
        </label>
        <textarea
          id="community-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={option.prompt}
          className="mt-2 min-h-40 w-full rounded-2xl border border-line bg-surface-glass p-4 text-base text-paper outline-none focus:border-spark-teal"
        />
        <div className="mt-1 flex justify-between text-xs text-paper-muted">
          <span>Mention someone with @handle.</span>
          <span className={cn("tabular-nums", count > COMMUNITY_BODY_MAX && "text-spark-coral")}>
            {count}/{COMMUNITY_BODY_MAX}
          </span>
        </div>
      </div>

      {topics.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold text-paper-muted">Topic (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t.slug}
                type="button"
                aria-pressed={topic === t.slug}
                onClick={() => setTopic(topic === t.slug ? null : t.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  topic === t.slug ? "border-spark-teal bg-accent-soft text-spark-teal" : "border-line text-paper-muted hover:text-paper",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-3">
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file */}
            <img src={preview} alt="The photo you attached" className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
            <button
              type="button"
              onClick={removePhoto}
              aria-label="Remove photo"
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink/80 text-paper"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-paper transition hover:border-spark-teal">
          <ImagePlus className="h-4 w-4" aria-hidden />
          {photo ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/*" className="sr-only" aria-label="Add a photo" onChange={pick} disabled={busy} />
        </label>
      </div>

      {needsProfile ? <GateHint gate="needsProfile" action="post" /> : null}
      {error ? (
        <p role="status" className="text-sm text-spark-coral">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="rounded-full" disabled={!check.ok || busy}>
        {busy ? "Posting…" : "Post"}
      </Button>
    </form>
  );
}
