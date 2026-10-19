// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireViewer = vi.fn();
const communityGate = vi.fn();
vi.mock("@/features/auth/requireViewer", () => ({ requireViewer: (p: string) => requireViewer(p) }));
vi.mock("@/features/community/gate", () => ({ communityGate: (...a: unknown[]) => communityGate(...a) }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({}) }));
vi.mock("@/server/api/topics", () => ({ listTopics: async () => [] }));
vi.mock("@/features/community/Composer", () => ({ Composer: () => null }));

import NewPostPage, { dynamic } from "@/app/community/new/page";

beforeEach(() => {
  requireViewer.mockReset();
  communityGate.mockReset();
  requireViewer.mockResolvedValue({ id: "u1", email: "v@example.com", name: "V", role: "VIEWER" });
});

describe("/community/new", () => {
  it("needs a signed-in viewer and comes back here", async () => {
    expect(dynamic).toBe("force-dynamic");
    communityGate.mockResolvedValue("ready");
    await NewPostPage();
    expect(requireViewer).toHaveBeenCalledWith("/community/new");
  });

  it("not a member yet: shows how to finish instead of the composer", async () => {
    communityGate.mockResolvedValue("needsProfile");
    const el = JSON.stringify(await NewPostPage());
    expect(el).toContain('"gate":"needsProfile"');
    expect(el).not.toContain('"topics"');
  });
});
