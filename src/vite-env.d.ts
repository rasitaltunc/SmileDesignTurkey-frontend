/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Build-time constants injected by Vite
declare const __BUILD_SHA__: string;
declare const __VERCEL_ENV__: string;
declare const __VERCEL_URL__: string;

