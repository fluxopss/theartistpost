"use client";

import { useEffect, useState } from "react";

export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)").matches;
    const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setStandalone(display || ios);
  }, []);

  return standalone;
}

export function useIosDevice(): boolean {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  return ios;
}
