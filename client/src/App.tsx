import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
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
import { Suspense, lazy, ReactNode } from "react";
import { Loader } from "@/components/ui/loader";

// Lazy-load the Analytics page
const AnalyticsPage = lazy(() => import("@/pages/analytics-page"));

// Lazy-load the Care Team portal pages
const CareTeamDashboardPage = lazy(() => import("@/pages/care-team/dashboard-page"));
const CareTeamLogsPage = lazy(() => import("@/pages/care-team/logs-page"));
const CareTeamAnalyticsPage = lazy(() => import("@/pages/care-team/analytics-page"));

// Role-based route protection
interface RoleProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string;
  roles: string[];
}

function RoleProtectedRoute({ component: Component, roles, ...rest }: RoleProtectedRouteProps) {
  const { user } = useAuth();
  
  const render = () => {
    // Not authenticated
    if (!user) {
      return <Redirect to="/auth" />;
    }
    
    // Check if user has the required role
    if (!roles.includes(user.role)) {
      // For care team users, redirect to care team dashboard
      if (user.role === "careteam") {
        return <Redirect to="/care-team/dashboard" />;
      }
      // For admin users, redirect to admin dashboard
      return <Redirect to="/dashboard" />;
    }
    
    return <Component />;
  };
  
  return <Route {...rest} component={render} />;
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/">
        {user ? (
          user.role === "careteam" ? (
            <Redirect to="/care-team/dashboard" />
          ) : (
            <Redirect to="/dashboard" />
          )
        ) : (
          <Redirect to="/auth" />
        )}
      </Route>
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/public/care-aid/:slug" component={CareAidPublicPage} />
      <Route path="/care-aid/:slug" component={({ params }) => {
        return <Redirect to={`/public/care-aid/${params.slug}`} />
      }} />
      <Route path="/embed/:slug" component={CareAidEmbedPage} />
      
      {/* Admin routes - only accessible to users with role "admin" */}
      <RoleProtectedRoute 
        path="/dashboard" 
        component={DashboardPage} 
        roles={["admin"]} 
      />
      <RoleProtectedRoute 
        path="/care-aids" 
        component={DashboardPage} 
        roles={["admin"]} 
      />
      <RoleProtectedRoute 
        path="/logs" 
        component={ChatLogsPage} 
        roles={["admin"]}
      />
      <RoleProtectedRoute 
        path="/knowledge-base" 
        component={KnowledgeBasePage} 
        roles={["admin"]}
      />
      <RoleProtectedRoute 
        path="/analytics" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="lg" variant="primary" /></div>}>
            <AnalyticsPage />
          </Suspense>
        )} 
        roles={["admin"]}
      />
      <RoleProtectedRoute 
        path="/settings" 
        component={SettingsPage} 
        roles={["admin"]}
      />
      <RoleProtectedRoute 
        path="/care-aid/:slug/:view?" 
        component={CareAidPage} 
        roles={["admin"]}
      />
      
      {/* Care Team Portal Routes - only accessible to users with role "careteam" */}
      <RoleProtectedRoute 
        path="/care-team/dashboard" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="lg" variant="primary" /></div>}>
            <CareTeamDashboardPage />
          </Suspense>
        )} 
        roles={["careteam"]}
      />
      <RoleProtectedRoute 
        path="/care-team/logs" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="lg" variant="primary" /></div>}>
            <CareTeamLogsPage />
          </Suspense>
        )} 
        roles={["careteam"]}
      />
      <RoleProtectedRoute 
        path="/care-team/analytics" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader size="lg" variant="primary" /></div>}>
            <CareTeamAnalyticsPage />
          </Suspense>
        )} 
        roles={["careteam"]}
      />
      
      {/* Catch-all route - 404 Not Found */}
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
