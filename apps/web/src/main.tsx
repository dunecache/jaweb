import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/jetbrains-mono/400.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import { ToastProvider } from "./components/app/toaster";
import { I18nProvider } from "./lib/i18n";
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
