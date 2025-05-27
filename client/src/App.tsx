import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import Sessions from "@/pages/sessions";
import Messages from "@/pages/messages-new";
import Campaigns from "@/pages/campaigns";
import Groups from "@/pages/groups";
import Reports from "@/pages/reports";
import Schedules from "@/pages/schedules";
import Notifications from "@/pages/notifications";
import RateLimit from "@/pages/rate-limit";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Check authentication status
  const { data: authData, isLoading: authLoading, error: authError } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (authError || !authData?.user)) {
      if (location !== "/login") {
        setLocation("/login");
      }
    }
  }, [authLoading, authError, authData, location, setLocation]);

  // Show login page
  if (location === "/login") {
    return <LoginPage />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Carregando PaZap...</p>
        </div>
      </div>
    );
  }

  // Show protected routes
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/messages" component={Messages} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/groups" component={Groups} />
        <Route path="/schedules" component={Schedules} />
        <Route path="/rate-limit" component={RateLimit} />
        <Route path="/reports" component={Reports} />
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;