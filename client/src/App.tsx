import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
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