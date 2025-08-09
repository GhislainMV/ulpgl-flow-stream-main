import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import Dashboard from "./pages/Dashboard";
import CreateDocument from "./pages/CreateDocument";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import Users from "./pages/Users";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <LanguageProvider defaultLanguage="fr">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes with Sidebar Layout */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <div className="flex-1 flex flex-col">
                          <Header />
                          <main className="flex-1 p-6 bg-muted/20">
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/create-document" element={<CreateDocument />} />
                              <Route path="/documents" element={<Documents />} />
                              <Route path="/notifications" element={<Notifications />} />
                              <Route path="/users" element={<Users />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </main>
                        </div>
                      </div>
                    </SidebarProvider>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
