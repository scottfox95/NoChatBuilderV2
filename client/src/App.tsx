import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import CareAidPage from "@/pages/care-aid-page";
import CareAidPublicPage from "@/pages/care-aid-public-page";
import CareAidEmbedPage from "@/pages/care-aid-embed-page";
import ChatLogsPage from "@/pages/chat-logs-page";
import KnowledgeBasePage from "@/pages/knowledge-base-page";
import SettingsPage from "@/pages/settings-page";
import { Suspense, lazy } from "react";
import { Loader } from "@/components/ui/loader";

// Lazy-load the Analytics page
const AnalyticsPage = lazy(() => import("@/pages/analytics-page"));

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/auth" />
      </Route>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/care-aids" component={DashboardPage} />
      <ProtectedRoute path="/logs" component={ChatLogsPage} />
      <ProtectedRoute path="/knowledge-base" component={KnowledgeBasePage} />
      <ProtectedRoute path="/analytics" component={() => (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="lg" variant="primary" /></div>}>
          <AnalyticsPage />
        </Suspense>
      )} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/care-aid/:slug/:view?" component={CareAidPage} />
      <Route path="/public/care-aid/:slug" component={CareAidPublicPage} />
      <Route path="/care-aid/:slug" component={({ params }) => {
        return <Redirect to={`/public/care-aid/${params.slug}`} />
      }} />
      <Route path="/embed/:slug" component={CareAidEmbedPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
