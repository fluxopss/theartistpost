"use client";

import { useEffect } from "react";
import { useToast } from "@/design-system/primitives/Toast";

export function PwaRegister() {
  const { push } = useToast();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                push({
                  title: "Gallery updated",
                  description: "Refresh to load the latest Artist Post.",
                });
              }
            });
          });
        })
        .catch(() => {
          /* offline shell is best-effort */
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [push]);

  return null;
}
