import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AppRoutes } from "./routes";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    },
  },
});

export function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <Toaster
          richColors
          expand
          position="bottom-right"
          closeButton
          duration={3500}
          toastOptions={{
            classNames: {
              toast:
                "font-sans text-sm rounded-xl shadow-2xl border border-border/60 bg-surface/95 backdrop-blur-md",
              title: "font-semibold text-text",
              description: "text-muted text-xs",
              closeButton:
                "rounded-lg text-muted hover:text-text transition-colors",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
