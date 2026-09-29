import { describe, expect, it, afterEach } from "vitest";
import {
  EXPO_DEV_FALLBACK_URL,
  resolveExpoDev,
  toExpoGoUrl,
  toHttpsTunnelUrl,
} from "@/server/api/expoDev";
import { GET as getExpoDev } from "@/app/api/v1/app/expo-dev/route";

const ENV_KEYS = [
  "EXPO_DEV_TUNNEL_URL",
  "EXPO_GO_URL",
  "EXPO_DEV_UPDATED_AT",
] as const;

const previous = new Map<string, string | undefined>();

function stashEnv() {
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previous.clear();
}

afterEach(() => {
  restoreEnv();
});

describe("toExpoGoUrl", () => {
  it("normalizes https tunnel hosts to exp://", () => {
    expect(toExpoGoUrl("https://t0w5g0w-anonymous-8081.exp.direct")).toBe(
      "exp://t0w5g0w-anonymous-8081.exp.direct",
    );
    expect(toExpoGoUrl("t0w5g0w-anonymous-8081.exp.direct")).toBe(
      "exp://t0w5g0w-anonymous-8081.exp.direct",
    );
    expect(toExpoGoUrl("exp://already.exp.direct")).toBe(
      "exp://already.exp.direct",
    );
  });

  it("returns null for empty input", () => {
    expect(toExpoGoUrl("")).toBeNull();
    expect(toExpoGoUrl("   ")).toBeNull();
  });
});

describe("toHttpsTunnelUrl", () => {
  it("maps exp:// back to https", () => {
    expect(toHttpsTunnelUrl("exp://host.exp.direct")).toBe(
      "https://host.exp.direct",
    );
  });
});

describe("resolveExpoDev", () => {
  it("uses EXPO_DEV_TUNNEL_URL when set", () => {
    stashEnv();
    process.env.EXPO_DEV_TUNNEL_URL =
      "https://fresh-anonymous-8081.exp.direct";
    process.env.EXPO_DEV_UPDATED_AT = "2026-09-29T02:00:00.000Z";

    const data = resolveExpoDev();
    expect(data.status).toBe("ready");
    expect(data.expoGoUrl).toBe("exp://fresh-anonymous-8081.exp.direct");
    expect(data.httpsUrl).toBe("https://fresh-anonymous-8081.exp.direct");
    expect(data.updatedAt).toBe("2026-09-29T02:00:00.000Z");
    expect(data.sdkMajor).toBe(57);
  });

  it("accepts EXPO_GO_URL alias", () => {
    stashEnv();
    process.env.EXPO_GO_URL = "exp://alias.exp.direct";
    expect(resolveExpoDev().expoGoUrl).toBe("exp://alias.exp.direct");
    expect(resolveExpoDev().status).toBe("ready");
  });

  it("falls back to the documented tunnel when env is unset", () => {
    stashEnv();
    const data = resolveExpoDev();
    expect(data.status).toBe("fallback");
    expect(data.expoGoUrl).toBe(EXPO_DEV_FALLBACK_URL);
  });
});

describe("GET /api/v1/app/expo-dev", () => {
  it("returns the envelope with a short public cache", async () => {
    stashEnv();
    process.env.EXPO_DEV_TUNNEL_URL = EXPO_DEV_FALLBACK_URL;

    const response = await getExpoDev();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.expoGoUrl).toBe(EXPO_DEV_FALLBACK_URL);
    expect(body.data.status).toBe("ready");
    expect(body.data.stores.ios).toContain("apps.apple.com");
    expect(body.data.project.slug).toBe("theartistpost-app");
  });
});
