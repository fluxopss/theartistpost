"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/firstTouch";

/** Saves UTMs, gclid and the landing page on the visitor's first visit. Renders nothing. */
export function FirstTouchCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
