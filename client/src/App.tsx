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
import AutoReplies from "@/pages/AutoReplies";
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
      <div className="min-h-screen flex items-center justify-center pazap-gradient-soft relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl float" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="pazap-gradient p-4 rounded-2xl shadow-lg pulse-orange mb-6 inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent mb-2">
            PaZap
          </h1>
          <p className="text-gray-600 font-medium">Carregando sistema...</p>
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
        <Route path="/auto-replies" component={AutoReplies} />
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