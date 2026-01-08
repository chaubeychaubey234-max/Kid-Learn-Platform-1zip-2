import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav, TopBar } from "@/components/Navigation";

import Home from "@/pages/Home";
import Watch from "@/pages/Watch";
import ParentDashboard from "@/pages/ParentDashboard";
import Create from "@/pages/Create";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const isWatchPage = location.startsWith('/watch');

  return (
    <>
      {/* Hide TopBar on Watch page for immersion */}
      {!isWatchPage && <TopBar />}
      
      <main className="min-h-screen">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/watch/:id" component={Watch} />
          <Route path="/parent" component={ParentDashboard} />
          <Route path="/create" component={Create} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Hide BottomNav on Watch page */}
      {!isWatchPage && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
