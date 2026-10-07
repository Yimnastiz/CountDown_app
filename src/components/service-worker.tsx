"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const update = () => void registration?.update().catch(() => undefined);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") update();
    };
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((nextRegistration) => {
        if (disposed) return;
        registration = nextRegistration;
        update();
        document.addEventListener("visibilitychange", onVisibilityChange);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return null;
}
