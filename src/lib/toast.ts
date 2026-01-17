// src/lib/toast.ts
// Safe Sonner wrapper: if Sonner crashes in some browsers/builds, app still works.

type SonnerModule = typeof import('sonner');

let sonnerMod: SonnerModule | null = null;
let sonnerPromise: Promise<SonnerModule> | null = null;

async function loadSonner(): Promise<SonnerModule> {
  if (sonnerMod) return sonnerMod;
  if (!sonnerPromise) {
    sonnerPromise = import('sonner')
      .then((m) => (sonnerMod = m))
      .catch((err) => {
        sonnerPromise = null;
        console.error('[toast] Failed to load sonner:', err);
        throw err;
      });
  }
  return sonnerPromise;
}

// Minimal safe API (extend if you use more)
export const toast = {
  message: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.message(msg, opts)).catch(() => 0),

  success: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.success(msg, opts)).catch(() => 0),

  info: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.info(msg, opts)).catch(() => 0),

  warning: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.warning(msg, opts)).catch(() => 0),

  error: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.error(msg, opts)).catch(() => 0),

  loading: (msg: any, opts?: any) =>
    loadSonner().then((m) => m.toast.loading(msg, opts)).catch(() => 0),

  dismiss: (id?: any) =>
    loadSonner().then((m) => m.toast.dismiss(id)).catch(() => id),

  // If you use toast.promise somewhere, keep it safe too:
  promise: (promise: any, data: any) =>
    loadSonner()
      .then((m) => m.toast.promise(promise, data))
      .catch(() => ({
        unwrap: async () => (promise instanceof Function ? await promise() : await promise),
      })),
};

