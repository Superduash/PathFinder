import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
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
        <ToastProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
