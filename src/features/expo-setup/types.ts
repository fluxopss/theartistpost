/** Shared Expo Go tip types — safe for client + server. */

export type ExpoDevStatus = "ready" | "fallback" | "offline";

export type ExpoDevPayload = {
  expoGoUrl: string | null;
  httpsUrl: string | null;
  updatedAt: string;
  status: ExpoDevStatus;
  sdkMajor: number;
  project: {
    owner: string;
    slug: string;
    dashboardUrl: string;
  };
  stores: {
    ios: string;
    android: string;
  };
  notes: string;
};
