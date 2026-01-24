// src/components/ToasterMount.tsx
// Safe Toaster mount: if Sonner fails to load, app continues without toasts
// Safari: Never import Sonner (prevents TDZ crash)

import React, { useEffect, useMemo, useState } from "react";

function isSafariUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
}

export default function ToasterMount() {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  const disabled = useMemo(() => {
    const envDisabled = (import.meta as any)?.env?.VITE_DISABLE_SONNER === "true";
    return envDisabled || isSafariUA();
  }, []);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;

    import("sonner")
      .then((mod) => {
        if (cancelled) return;
        if (typeof mod?.Toaster === "function") setComp(() => mod.Toaster);
      })
      .catch((err) => {
        console.warn("[ToasterMount] Sonner failed to load; disabling toasts.", err);
      });

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  if (disabled || !Comp) return null;
  const Toaster = Comp;
  return <Toaster richColors position="top-right" />;
}
