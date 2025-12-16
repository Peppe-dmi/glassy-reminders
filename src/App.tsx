import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReminderProvider } from "@/contexts/ReminderContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useBackButton } from "@/hooks/useBackButton";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente che gestisce il back button (deve essere dentro BrowserRouter)
function AppRoutes() {
  useBackButton();
  
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/category/:categoryId" element={<CategoryPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <ReminderProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ReminderProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
