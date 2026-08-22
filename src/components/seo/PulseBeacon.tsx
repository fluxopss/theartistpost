import Script from "next/script";

const PULSE_URL = (
  process.env.NEXT_PUBLIC_PULSE_URL || "https://pulse.fluxlab.agency"
).replace(/\/$/, "");
const PULSE_KEY = process.env.NEXT_PUBLIC_PULSE_KEY || "";

export function PulseBeacon() {
  if (!PULSE_KEY) return null;
  return (
    <Script
      src={`${PULSE_URL}/beacon.js`}
      strategy="afterInteractive"
      data-key={PULSE_KEY}
    />
  );
}
