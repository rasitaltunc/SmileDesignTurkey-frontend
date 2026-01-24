// src/lib/toast.ts
// Safe Sonner wrapper: if Sonner crashes in some browsers/builds, app still works.
// Safari: Never import Sonner (prevents TDZ crash - "Cannot access uninitialized variable")

type AnyFn = (...args: any[]) => any;

function isSafariUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua);
}

function toastsDisabled(): boolean {
  const envDisabled = (import.meta as any)?.env?.VITE_DISABLE_SONNER === "true";
  return envDisabled || (typeof window !== "undefined" && isSafariUA());
}

let sonnerPromise: Promise<any> | null = null;
async function getSonner(): Promise<any | null> {
  if (toastsDisabled()) return null;
  if (!sonnerPromise) sonnerPromise = import("sonner").catch(() => null);
  return sonnerPromise;
}

function logFallback(kind: string, msg: any) {
  try {
    // keep it quiet but visible for debugging
    console.log(`[toast:${kind}]`, msg);
  } catch {}
}

export const toast: {
  success: AnyFn;
  error: AnyFn;
  info: AnyFn;
  message: AnyFn;
  warning: AnyFn;
  loading: AnyFn;
  dismiss: AnyFn;
  promise: <T>(p: Promise<T>, msgs: any, opts?: any) => Promise<T>;
} = {
  success: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("success", msg);
    void getSonner().then((m) => m?.toast?.success?.(msg, opts)).catch(() => {});
  },
  error: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("error", msg);
    void getSonner().then((m) => m?.toast?.error?.(msg, opts)).catch(() => {});
  },
  info: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("info", msg);
    void getSonner().then((m) => m?.toast?.info?.(msg, opts)).catch(() => {});
  },
  message: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("message", msg);
    void getSonner().then((m) => m?.toast?.message?.(msg, opts)).catch(() => {});
  },
  warning: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("warning", msg);
    void getSonner().then((m) => m?.toast?.warning?.(msg, opts)).catch(() => {});
  },
  loading: (msg: any, opts?: any) => {
    if (toastsDisabled()) return logFallback("loading", msg);
    void getSonner().then((m) => m?.toast?.loading?.(msg, opts)).catch(() => {});
  },
  dismiss: (id?: any) => {
    if (toastsDisabled()) return;
    void getSonner().then((m) => m?.toast?.dismiss?.(id)).catch(() => {});
  },
  promise: async <T,>(p: Promise<T>, msgs: any, opts?: any): Promise<T> => {
    if (toastsDisabled()) return p;
    const m = await getSonner();
    if (!m?.toast?.promise) return p;
    return m.toast.promise(p, msgs, opts);
  },
};
