/**
 * What the native app checks on launch. Bump `minSupportedVersion` to force
 * an update; flip flags as features ship. Nothing here is a secret.
 */
export type AppConfig = {
  minSupportedVersion: string;
  latestVersion: string;
  flags: { wallCanvas: boolean; publishing: boolean; accounts: boolean };
  notices: Array<{ id: string; title: string; body: string }>;
};

export const APP_CONFIG: AppConfig = {
  minSupportedVersion: "1.0.0",
  latestVersion: "1.0.0",
  flags: { wallCanvas: false, publishing: false, accounts: false },
  notices: [],
};
