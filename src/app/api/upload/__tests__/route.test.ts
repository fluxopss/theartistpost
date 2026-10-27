// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const findUnique = vi.fn();

vi.mock("@/features/auth/adapter", () => ({ getSession: () => getSession() }));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({ user: { findUnique } }),
}));

import { POST } from "@/app/api/upload/route";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const ADMIN = {
  id: "u_admin",
  email: "robbie@theartistpost.org",
  name: "Robbie",
  role: "ADMIN",
  suspendedAt: null,
  artistProfile: null,
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tap-legacy-upload-"));
  vi.stubEnv("UPLOAD_DIR", dir);
  getSession.mockReset();
  findUnique.mockReset();
  getSession.mockResolvedValue({
    id: "u_admin",
    email: "Robbie@TheArtistPost.org",
    name: "Robbie",
    role: "ADMIN",
  });
  findUnique.mockResolvedValue(ADMIN);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

function upload(headers: Record<string, string>, ip = "203.0.113.70") {
  const form = new FormData();
  form.set("file", new File([PNG], "a.png", { type: "image/png" }));
  return new Request("https://theartistpost.org/api/upload", {
    method: "POST",
    headers: { host: "theartistpost.org", "x-forwarded-for": ip, ...headers },
    body: form,
  });
}

describe("POST /api/upload (legacy studio upload)", () => {
  it("refuses a cross-origin cookie write before touching the session", async () => {
    const response = await POST(upload({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("refuses a write with no origin or referer", async () => {
    const response = await POST(upload({}));
    expect(response.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("accepts a same-origin upload and looks the user up by lowercased email", async () => {
    const response = await POST(upload({ origin: "https://theartistpost.org" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "robbie@theartistpost.org" },
      }),
    );
  });
});
