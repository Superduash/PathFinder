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
        </HashRouter>
        <Toaster richColors position="top-right" closeButton duration={3500} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
