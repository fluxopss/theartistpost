"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import type { MeDTO } from "@/server/api/meProfile";
import type { TopicDTO } from "@/server/api/topics";
import { refreshSessionCookieAction } from "@/features/account/actions";
import { clearDraft, loadDraft, saveDraft, type ProfileDraft } from "@/features/account/profileDraft";
import { draftFromMe, hasChanges, profilePatch } from "@/features/account/profileForm";
import { webApi } from "@/features/account/webApi";
import { initialsOf } from "@/features/account/accountLinks";
import { Button } from "@/shared/ui/Button";
import { communityGuidelines } from "@/content/guidelines";
import { cn } from "@/shared/lib/cn";
import {
  BIO_MAX,
  HEADLINE_MAX,
  IMAGE_MAX_BYTES,
  LOCATION_MAX,
  NAME_MAX,
  TOPICS_MAX,
} from "@/shared/lib/limits";

const input =
  "mt-2 min-h-12 w-full rounded-2xl border border-line bg-surface-glass px-4 text-sm text-paper outline-none transition focus:border-spark-teal";
const labelText = "text-xs font-semibold text-paper-muted";

type Props = {
  me: MeDTO;
  topics: TopicDTO[];
  chapters: Array<{ id: string; name: string }>;
};

export function EditProfileForm({ me, topics, chapters }: Props) {
  const router = useRouter();
  const userId = me.user.id;
  const [initial, setInitial] = useState<ProfileDraft>(() => draftFromMe(me));
  // Client-only component (see EditProfileClient), so reading storage here is safe.
  const [savedDraft] = useState(() => {
    const saved = loadDraft(userId);
    return saved && hasChanges(draftFromMe(me), saved) ? saved : null;
  });
  const [draft, setDraft] = useState<ProfileDraft>(() => savedDraft ?? draftFromMe(me));
  const restored = savedDraft !== null;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(me.user.image ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [uploading, startUploading] = useTransition();
  const [accepting, startAccepting] = useTransition();
  const [termsAccepted, setTermsAccepted] = useState(Boolean(me.user.termsAcceptedAt));
  const [askedForGuidelines] = useState(!me.user.termsAcceptedAt);
  const [agreed, setAgreed] = useState(false);
  const [guidelinesError, setGuidelinesError] = useState<string | null>(null);
  const isArtist = Boolean(me.profile);

  const suspended = me.user.suspended;
  const isApprovedArtist = Boolean(me.profile?.approved);

  // Keep what they type even if the tab closes before Save.
  useEffect(() => {
    if (hasChanges(initial, draft)) saveDraft(userId, draft);
  }, [draft, initial, userId]);

  /** Best effort: the save already worked, a hiccup here must never look like a failure. */
  async function refreshHeader() {
    try {
      await refreshSessionCookieAction();
    } catch {
      // Next full navigation re-reads the database anyway.
    }
    router.refresh();
  }

  function acceptGuidelines() {
    startAccepting(async () => {
      const result = await webApi<{ termsAcceptedAt: string }>("/me/terms", {
        method: "POST",
        json: { accept: true },
      });
      if (!result.ok) {
        setGuidelinesError(result.error.message);
        return;
      }
      setTermsAccepted(true);
      router.refresh();
    });
  }

  function set<K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: "" }));
    setMessage(null);
  }

  function toggleTopic(slug: string) {
    set(
      "topicSlugs",
      draft.topicSlugs.includes(slug)
        ? draft.topicSlugs.filter((s) => s !== slug)
        : [...draft.topicSlugs, slug],
    );
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const patch = profilePatch(initial, draft);
    if (Object.keys(patch).length === 0) {
      setMessage({ tone: "ok", text: "Nothing new to save yet." });
      return;
    }
    saveDraft(userId, draft);
    startSaving(async () => {
      const result = await webApi<MeDTO>("/me", { method: "PATCH", json: patch });
      if (!result.ok) {
        setFieldErrors(result.error.fields ?? {});
        setMessage({ tone: "error", text: result.error.message });
        return;
      }
      clearDraft(userId);
      const next = draftFromMe(result.data);
      setInitial(next);
      setDraft(next);
      setFieldErrors({});
      setMessage({ tone: "ok", text: "Saved. Your profile is updated on the app too." });
      await refreshHeader();
    });
  }

  function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Profile photos must be images (JPEG, PNG, WebP or GIF).");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setAvatarError("Image must be under 2.5MB.");
      return;
    }
    const form = new FormData();
    form.set("file", file);
    startUploading(async () => {
      const result = await webApi<{ avatarUrl: string }>("/me/avatar", { method: "POST", form });
      if (!result.ok) {
        setAvatarError(result.error.message);
        return;
      }
      setAvatar(result.data.avatarUrl);
      await refreshHeader();
    });
  }

  return (
    <form onSubmit={save} className="space-y-8" noValidate>
      {suspended ? (
        <p role="status" className="rounded-2xl border border-spark-coral/40 bg-spark-coral/10 p-4 text-sm text-paper">
          Your account is paused, so profile changes are on hold for now. You can still delete your account from Settings.
        </p>
      ) : null}
      {restored ? (
        <p role="status" className="rounded-2xl border border-spark-teal/40 bg-accent-soft p-4 text-sm text-paper">
          Your unsaved changes are back. Save when you are ready.
        </p>
      ) : null}

      <section className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-glass text-xl font-semibold text-paper">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
            <img src={avatar} alt="" width={80} height={80} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initialsOf(draft.name || me.user.name)}</span>
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-paper transition hover:border-spark-teal">
            <Camera className="h-4 w-4" aria-hidden />
            {uploading ? "Uploading…" : "Change profile photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Profile photo"
              disabled={uploading || suspended}
              onChange={pickPhoto}
            />
          </label>
          {avatarError ? <p className="mt-2 text-xs text-spark-coral">{avatarError}</p> : null}
        </div>
      </section>

      <section className="space-y-4">
        <Field label="Name" error={fieldErrors.name}>
          <input id="pf-name" className={input} value={draft.name} maxLength={NAME_MAX} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field
          label="Handle"
          hint={isArtist ? "Set by the house team" : "Your link: /u/your-handle"}
          error={fieldErrors.handle}
        >
          <input
            id="pf-handle"
            className={cn(input, isArtist && "opacity-70")}
            value={draft.handle}
            readOnly={isArtist}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            placeholder="rae-lin"
            onChange={(e) => set("handle", e.target.value)}
          />
        </Field>
        <Field label="Headline" hint={`${draft.headline.length}/${HEADLINE_MAX}`} error={fieldErrors.headline}>
          <input id="pf-headline" className={input} value={draft.headline} maxLength={HEADLINE_MAX} placeholder="Muralist, poet, DJ…" onChange={(e) => set("headline", e.target.value)} />
        </Field>
        <Field label="Bio" hint={`${draft.bio.length}/${BIO_MAX}`} error={fieldErrors.bio}>
          <textarea id="pf-bio" className={cn(input, "min-h-32 py-3")} value={draft.bio} maxLength={BIO_MAX} onChange={(e) => set("bio", e.target.value)} />
        </Field>
        <Field label="Location" error={fieldErrors.location}>
          <input id="pf-location" className={input} value={draft.location} maxLength={LOCATION_MAX} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field label="Home chapter" error={fieldErrors.chapterId}>
          <select id="pf-chapter" className={input} value={draft.chapterId ?? ""} onChange={(e) => set("chapterId", e.target.value || null)}>
            <option value="">No chapter</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </section>

      {topics.length > 0 ? (
        <fieldset>
          <legend className={labelText}>
            What you&apos;re into · {draft.topicSlugs.length}/{TOPICS_MAX}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {topics.map((topic) => {
              const selected = draft.topicSlugs.includes(topic.slug);
              const full = !selected && draft.topicSlugs.length >= TOPICS_MAX;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  aria-pressed={selected}
                  disabled={full}
                  onClick={() => toggleTopic(topic.slug)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-40",
                    selected ? "border-spark-teal bg-accent-soft text-spark-teal" : "border-line text-paper-muted hover:text-paper",
                  )}
                >
                  {topic.name}
                </button>
              );
            })}
          </div>
          {fieldErrors.topicSlugs ? <p className="mt-2 text-xs text-spark-coral">{fieldErrors.topicSlugs}</p> : null}
        </fieldset>
      ) : null}

      {isApprovedArtist ? (
        <section className="space-y-4">
          <p className={labelText}>Get paid directly · shown on your profile</p>
          <Field label="Venmo username" error={fieldErrors.venmoUsername}>
            <input id="pf-venmo" className={input} value={draft.venmoUsername} onChange={(e) => set("venmoUsername", e.target.value)} />
          </Field>
          <Field label="Cash App $cashtag" error={fieldErrors.cashAppTag}>
            <input id="pf-cashapp" className={input} value={draft.cashAppTag} onChange={(e) => set("cashAppTag", e.target.value)} />
          </Field>
          <Field label="PayPal.Me username" error={fieldErrors.paypalMeUsername}>
            <input id="pf-paypal" className={input} value={draft.paypalMeUsername} onChange={(e) => set("paypalMeUsername", e.target.value)} />
          </Field>
        </section>
      ) : null}

      {askedForGuidelines ? (
        <section className="space-y-4 rounded-2xl border border-line p-5" aria-labelledby="guidelines-title">
          <h2 id="guidelines-title" className="display text-2xl text-paper">
            {communityGuidelines.title}
          </h2>
          {termsAccepted ? (
            <p role="status" className="text-sm text-spark-teal">
              Thanks for agreeing. You can follow, post and reply here and in the app.
            </p>
          ) : (
            <>
              <div className="max-h-72 space-y-3 overflow-y-auto pr-2 text-sm text-paper-muted">
                {communityGuidelines.sections.map((section, index) => (
                  <div key={section.heading ?? `intro-${index}`}>
                    {section.heading ? <h3 className="font-semibold text-paper">{section.heading}</h3> : null}
                    {section.list === "bullets" ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {section.body.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      section.body.map((line) => <p key={line} className="mt-1">{line}</p>)
                    )}
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-3 text-sm text-paper">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-spark-teal,#2dd4bf)]"
                />
                I have read and agree to the Community Guidelines.
              </label>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!agreed || accepting || suspended}
                onClick={acceptGuidelines}
              >
                {accepting ? "Saving…" : "Agree to the guidelines"}
              </Button>
              {guidelinesError ? <p className="text-xs text-spark-coral">{guidelinesError}</p> : null}
            </>
          )}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" className="rounded-full" disabled={saving || suspended}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {message ? (
          <p role="status" className={cn("text-sm", message.tone === "ok" ? "text-spark-teal" : "text-spark-coral")}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ id: string }>;
}) {
  const id = children.props.id;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={labelText}>{label}</label>
        {hint ? <span className="text-[11px] text-paper-muted">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-xs text-spark-coral">{error}</p> : null}
    </div>
  );
}
