// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() =>
  vi.fn(async () => ({ get: () => undefined, set: () => undefined })),
);
vi.mock("next/headers", () => ({ cookies }));

import { readSessionFromCookie } from "@/features/auth/sessionCookie";

afterEach(() => {
  vi.unstubAllEnvs();
  cookies.mockClear();
});

describe("readSessionFromCookie keeps pages per-request", () => {
  it("reads cookies even when no AUTH_SECRET is set (build without secrets)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    await expect(readSessionFromCookie()).resolves.toBeNull();
    // Touching cookies() is what marks the root layout dynamic in Next.
    expect(cookies).toHaveBeenCalledTimes(1);
  });

  it("reads cookies when the secret is set", async () => {
    vi.stubEnv("AUTH_SECRET", "a-real-secret");
    await expect(readSessionFromCookie()).resolves.toBeNull();
    expect(cookies).toHaveBeenCalledTimes(1);
  });
});
