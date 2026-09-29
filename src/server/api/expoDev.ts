/**
 * Live Expo Go tunnel for the mobile tip.
 *
 * Ops (VPS): set EXPO_DEV_TUNNEL_URL or EXPO_GO_URL to the current
 * `exp://…exp.direct` (or https://…exp.direct) after Metro restarts, then
 * restart pm2 so Next picks it up. Example:
 *
 *   EXPO_DEV_TUNNEL_URL=exp://t0w5g0w-anonymous-8081.exp.direct
 *
 * Optional: EXPO_DEV_UPDATED_AT=ISO-8601 when the tunnel was last refreshed.
 */

import type { ExpoDevPayload } from "@/features/expo-setup/types";

export type { ExpoDevPayload, ExpoDevStatus } from "@/features/expo-setup/types";

/** Last known working anonymous tunnel — only used when env is unset. */
export const EXPO_DEV_FALLBACK_URL =
  "exp://t0w5g0w-anonymous-8081.exp.direct";

export const EXPO_GO_STORES = {
  ios: "https://apps.apple.com/app/expo-go/id982107779",
  android: "https://play.google.com/store/apps/details?id=host.exp.exponent",
} as const;

export const EXPO_PROJECT = {
  owner: "fluxlabsfloridas-team",
  slug: "theartistpost-app",
  dashboardUrl:
    "https://expo.dev/accounts/fluxlabsfloridas-team/projects/theartistpost-app",
} as const;

/** Normalize https tunnel hosts and bare hosts into an `exp://` deep link. */
export function toExpoGoUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^exp:\/\//i.test(trimmed)) {
    return trimmed.replace(/^exp:\/\//i, "exp://");
  }

  if (/^exps:\/\//i.test(trimmed)) {
    return `exp://${trimmed.slice("exps://".length)}`;
  }

  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProto);
    if (!url.hostname) return null;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `exp://${url.host}${path}`;
  } catch {
    return null;
  }
}

export function toHttpsTunnelUrl(expoGoUrl: string): string | null {
  if (!/^exp:\/\//i.test(expoGoUrl)) return null;
  const rest = expoGoUrl.replace(/^exp:\/\//i, "");
  return `https://${rest}`;
}

function readEnvUrl(): string | null {
  const raw =
    process.env.EXPO_DEV_TUNNEL_URL?.trim() ||
    process.env.EXPO_GO_URL?.trim() ||
    "";
  return raw || null;
}

export function resolveExpoDev(): ExpoDevPayload {
  const fromEnv = readEnvUrl();
  const updatedAt =
    process.env.EXPO_DEV_UPDATED_AT?.trim() || new Date().toISOString();

  const base = {
    sdkMajor: 57,
    project: { ...EXPO_PROJECT },
    stores: { ...EXPO_GO_STORES },
    notes:
      "Needs the latest Expo Go (SDK matching this project) and a running `npx expo start --tunnel --go` session. Flux updates EXPO_DEV_TUNNEL_URL on the VPS when the tunnel host changes.",
  };

  if (fromEnv) {
    const expoGoUrl = toExpoGoUrl(fromEnv);
    if (expoGoUrl) {
      return {
        ...base,
        expoGoUrl,
        httpsUrl: toHttpsTunnelUrl(expoGoUrl),
        updatedAt,
        status: "ready",
      };
    }
  }

  const fallback = toExpoGoUrl(EXPO_DEV_FALLBACK_URL);
  if (fallback) {
    return {
      ...base,
      expoGoUrl: fallback,
      httpsUrl: toHttpsTunnelUrl(fallback),
      updatedAt,
      status: "fallback",
      notes: `${base.notes} Env unset — serving documented fallback tunnel; confirm Metro is still on this host.`,
    };
  }

  return {
    ...base,
    expoGoUrl: null,
    httpsUrl: null,
    updatedAt,
    status: "offline",
    notes:
      "No tunnel URL configured. Set EXPO_DEV_TUNNEL_URL on the VPS and restart the app process.",
  };
}
