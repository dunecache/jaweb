import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/geist-mono/400.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import { ToastProvider } from "./components/app/toaster";
import { I18nProvider } from "./lib/i18n";
import { UNAUTHORIZED_EVENT } from "./lib/unauthorized";
import { Router } from "./router";
import "./styles/theme.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// A 401 from any authenticated request publishes jaweb:unauthorized. Clear all
// cached data and hard-redirect to login; the guard keeps concurrent 401s from
// stacking up while the redirect is in flight.
let unauthorizedRedirectInFlight = false;
window.addEventListener(UNAUTHORIZED_EVENT, () => {
  if (unauthorizedRedirectInFlight) return;
  unauthorizedRedirectInFlight = true;
  queryClient.clear();
  window.location.assign("/login");
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </I18nProvider>
  </QueryClientProvider>,
);
