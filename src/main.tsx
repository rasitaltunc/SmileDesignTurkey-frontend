import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initPosthog } from "./lib/posthog";
import { LanguageProvider } from "./lib/i18n";
import { Toaster } from "sonner";

// Initialize PostHog once at app startup
initPosthog();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageProvider>
      <App />
      <Toaster richColors position="top-right" />
    </LanguageProvider>
  </HelmetProvider>
);
