import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import Explore from "@/pages/Explore";
import SafeExplore from "@/pages/SafeExplore";
import Shorts from "@/pages/Shorts";
import Chat from "@/pages/Chat";
import Chatbot from "@/pages/Chatbot";
import Rewards from "@/pages/Rewards";
import ParentDashboard from "@/pages/ParentDashboard";
import CreatorDashboard from "@/pages/CreatorDashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { KidsCard } from "@/components/kids-card";
import { Lock } from "lucide-react";
import Navigation from "./components/Navigation";
import Help from "@/pages/Help";

/* ---------------- Protected Route ---------------- */

function ProtectedRoute({
  component: Component,
  roles,
}: {
  component: any;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <KidsCard className="p-12 space-y-6">
          <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            Sorry! You don't have access to this section.
          </p>
        </KidsCard>
      </div>
    );
  }

  return <Component />;
}

/* ---------------- Router ---------------- */

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/categories" component={Categories} />
      <Route path="/explore" component={Explore} />
      <Route path="/safe-explore" component={SafeExplore} />

      <Route path="/chatbot">
        <ProtectedRoute component={Chatbot} roles={["child"]} />
      </Route>

      <Route path="/rewards">
        <ProtectedRoute component={Rewards} roles={["child"]} />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={ParentDashboard} roles={["parent"]} />
      </Route>

      <Route path="/creator">
        <ProtectedRoute component={CreatorDashboard} roles={["creator"]} />
      </Route>

      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/help">
      <ProtectedRoute component={Help} roles={["child"]} />
      </Route>
      <Route component={NotFound} />

    </Switch>
  );
}

/* ---------------- MAIN APP ---------------- */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
            <Navigation />
            <Layout>
              <Router />
            </Layout>
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

