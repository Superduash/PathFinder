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
    },
  },
});

export function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AppRoutes />
          <Toaster
            position="bottom-center"
            offset={24}
            toastOptions={{
              className: "border border-border bg-surface text-text rounded-xl shadow-lg text-sm",
            }}
          />
        </HashRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
