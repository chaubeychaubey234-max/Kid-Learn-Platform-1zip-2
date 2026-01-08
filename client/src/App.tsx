import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { ContentCard } from "@/components/content-card";
import type { Content } from "@shared/schema";

function Home() {
  const { data: contents, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const { data: health } = useQuery<{ status: string; service: string }>({
    queryKey: ["/api/health"],
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Welcome Back, Explorer!</h2>
          {health && (
            <Badge variant="outline" className="text-[10px] opacity-50">
              System: {health.status}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">What do you want to learn today?</p>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {contents?.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
