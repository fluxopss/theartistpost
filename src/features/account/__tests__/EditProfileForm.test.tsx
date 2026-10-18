import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeDTO } from "@/server/api/meProfile";

const webApi = vi.fn();
const refresh = vi.fn();
const refreshSessionCookieAction = vi.fn(async () => ({ ok: true }));

vi.mock("@/features/account/webApi", () => ({ webApi: (...args: unknown[]) => webApi(...args) }));
vi.mock("@/features/account/actions", () => ({ refreshSessionCookieAction: () => refreshSessionCookieAction() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }) }));

import { EditProfileForm } from "../EditProfileForm";
import { loadDraft, saveDraft } from "../profileDraft";
import { profilePatch } from "../profileForm";

const topics = Array.from({ length: 10 }, (_, i) => ({ slug: `t${i}`, name: `Topic ${i}`, kind: "genre" as const }));
const chapters = [{ id: "fl-wpb", name: "West Palm Beach" }];

function makeMe(over: Partial<MeDTO["user"]> = {}, profile: MeDTO["profile"] = null): MeDTO {
  return {
    user: {
      id: "u1",
      name: "Rae Lin",
      email: "rae@example.com",
      handle: "rae",
      role: "VIEWER",
      image: null,
      bio: null,
      headline: "Painter",
      location: null,
      chapterId: null,
      venmoUsername: null,
      cashAppTag: null,
      paypalMeUsername: null,
      topics: [],
      termsAcceptedAt: null,
      suspended: false,
      followerCount: 0,
      followingCount: 0,
      unreadNotifications: 0,
      ...over,
    } as MeDTO["user"],
    canPublish: false,
    permissions: { publish: false, admin: false },
    profile,
  };
}

const renderForm = (me = makeMe()) => render(<EditProfileForm me={me} topics={topics} chapters={chapters} />);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
beforeEach(() => {
  webApi.mockReset();
  refresh.mockReset();
  refreshSessionCookieAction.mockClear();
});

describe("profilePatch", () => {
  it("sends only changed fields, empty optional text as null", () => {
    const base = { name: "Rae", headline: "Painter", bio: "", location: "", chapterId: null, topicSlugs: [], venmoUsername: "", cashAppTag: "", paypalMeUsername: "" };
    expect(profilePatch(base, { ...base, headline: "Muralist" })).toEqual({ headline: "Muralist" });
    expect(profilePatch(base, { ...base, headline: "" })).toEqual({ headline: null });
    expect(profilePatch(base, { ...base, topicSlugs: ["t1"] })).toEqual({ topicSlugs: ["t1"] });
    expect(profilePatch(base, { ...base, headline: "  Painter " })).toEqual({});
  });
});

describe("EditProfileForm", () => {
  it("sends only the changed field in the PATCH and refreshes the header", async () => {
    webApi.mockResolvedValue({ ok: true, data: makeMe({ headline: "Muralist" }) });
    renderForm();
    const headline = screen.getByLabelText(/headline/i);
    await userEvent.clear(headline);
    await userEvent.type(headline, "Muralist");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(webApi).toHaveBeenCalledWith("/me", { method: "PATCH", json: { headline: "Muralist" } }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(refreshSessionCookieAction).toHaveBeenCalled();
    expect(await screen.findByText(/updated on the app too/i)).toBeInTheDocument();
    expect(loadDraft("u1")).toBeNull();
  });

  it("shows server field errors next to the field", async () => {
    webApi.mockResolvedValue({ ok: false, status: 400, error: { code: "validation_failed", message: "Bad", fields: { bio: "Too long for a bio." } } });
    renderForm();
    await userEvent.type(screen.getByLabelText(/^bio/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Too long for a bio.")).toBeInTheDocument();
  });

  it("keeps a draft when the save fails, and brings it back next time with a notice", async () => {
    webApi.mockResolvedValue({ ok: false, status: 401, error: { code: "unauthorized", message: "Sign in" } });
    renderForm();
    const headline = screen.getByLabelText(/headline/i);
    await userEvent.clear(headline);
    await userEvent.type(headline, "Muralist");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(loadDraft("u1")?.headline).toBe("Muralist"));
    cleanup();

    renderForm();
    expect(screen.getByLabelText(/headline/i)).toHaveValue("Muralist");
    expect(screen.getByText(/unsaved changes are back/i)).toBeInTheDocument();
  });

  it("does not show a notice for a draft identical to the saved profile", () => {
    saveDraft("u1", { name: "Rae Lin", headline: "Painter", bio: "", location: "", chapterId: null, topicSlugs: [], venmoUsername: "", cashAppTag: "", paypalMeUsername: "" });
    renderForm();
    expect(screen.queryByText(/unsaved changes are back/i)).toBeNull();
  });

  it("disables topic chips past the limit", async () => {
    renderForm();
    for (let i = 0; i < 8; i++) await userEvent.click(screen.getByRole("button", { name: `Topic ${i}` }));
    expect(screen.getByRole("button", { name: "Topic 8" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Topic 0" })).toBeEnabled();
  });

  it("hides payment usernames unless the profile is an approved artist", () => {
    renderForm();
    expect(screen.queryByLabelText(/venmo/i)).toBeNull();
    cleanup();
    renderForm(makeMe({ role: "ARTIST" }, { approved: true, pendingApproval: false } as MeDTO["profile"]));
    expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
  });

  it("shows the paused note and disables Save when suspended", () => {
    renderForm(makeMe({ suspended: true }));
    expect(screen.getByText(/account is paused/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("uploads a new photo as multipart and refreshes", async () => {
    webApi.mockResolvedValue({ ok: true, data: { avatarUrl: "https://theartistpost.org/uploads/a.jpg" } });
    renderForm();
    const file = new File(["img"], "a.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText(/profile photo/i), file);
    await waitFor(() => expect(webApi).toHaveBeenCalledWith("/me/avatar", expect.objectContaining({ method: "POST", form: expect.any(FormData) })));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("refuses a photo over the size limit before uploading", async () => {
    renderForm();
    const big = new File([new Uint8Array(3 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText(/profile photo/i), big);
    expect(await screen.findByText(/under 2.5MB/i)).toBeInTheDocument();
    expect(webApi).not.toHaveBeenCalled();
  });
});
