import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./lib/i18n";
import ToasterMount from "./components/ToasterMount";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// PostHog is now lazy-loaded on first capture() call in public routes
// (No eager init at app startup - reduces initial bundle size)

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
  <HelmetProvider>
    <LanguageProvider>
      <App />
      <ToasterMount />
    </LanguageProvider>
  </HelmetProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
