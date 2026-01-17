// src/lib/sonnerStub.tsx
// No-op stub for Sonner: prevents Sonner from entering bundle (Safari TDZ crash fix)

import React from "react";

// No-op toast API (keeps app alive)
type AnyFn = (...args: any[]) => any;

const noop: AnyFn = () => {};
const toastFn: any = Object.assign(noop, {
  success: noop,
  info: noop,
  warning: noop,
  error: noop,
  message: noop,
  promise: (promise: any) => promise, // Return promise as-is
  dismiss: noop,
  loading: noop,
  custom: noop,
  getHistory: () => [],
  getToasts: () => [],
});

export const toast = toastFn;

// No-op Toaster component
export function Toaster(_props?: any) {
  return null;
}

// Optional hook compatibility
export function useSonner() {
  return { toasts: [] as any[] };
}

// Default export for compatibility
export default { toast, Toaster, useSonner };

