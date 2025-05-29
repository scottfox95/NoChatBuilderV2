import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, TrendingUp, MessageSquare, Settings, LogOut, FileText, Database, BarChart2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import aidifyLogo from "@/assets/aidify-logo-new.png";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isActive = (path: string) => {
    return location === path ? 
      "bg-primary text-white shadow-sm" : 
      "hover:bg-slate-100 text-slate-700";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 bg-white border-r border-slate-200 hidden md:block shadow-sm">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-200">
            <div className="hidden md:block">
              <img src={aidifyLogo} alt="Aidify" className="h-8" />
            </div>
            <div className="block md:hidden text-center">
              <img src={aidifyLogo} alt="Aidify" className="h-6 mx-auto" />
            </div>
          </div>
          
          <nav className="flex-1 p-3 overflow-y-auto">
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/dashboard")}`}>
                    <TrendingUp className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/care-aids">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/care-aids")}`}>
                    <MessageSquare className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Care Aids</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/logs">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/logs")}`}>
                    <FileText className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Chat Logs</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/knowledge-base">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/knowledge-base")}`}>
                    <Database className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Knowledge Base</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/analytics">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/analytics")}`}>
                    <BarChart2 className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Analytics</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/care-team-management">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/care-team-management")}`}>
                    <Users className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Care Team Users</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/settings">
                  <a className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${isActive("/settings")}`}>
                    <Settings className="h-5 w-5 stroke-2" />
                    <span className="ml-3 hidden md:block">Settings</span>
                  </a>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="p-3 border-t border-slate-200">
            <Button 
              variant="ghost" 
              className="w-full justify-start p-3 text-slate-700 hover:bg-slate-100"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5 stroke-2" />
              )}
              <span className="ml-3 hidden md:block">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div>
            <img src={aidifyLogo} alt="Aidify" className="h-8" />
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5 text-slate-700" />
              )}
            </Button>
          </div>
        </div>
        <Separator className="bg-slate-200" />
        <nav className="flex justify-around p-2 bg-slate-50">
          <Link href="/dashboard">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/dashboard" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <TrendingUp className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Dashboard</span>
            </a>
          </Link>
          <Link href="/care-aids">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/care-aids" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <MessageSquare className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Care Aids</span>
            </a>
          </Link>
          <Link href="/logs">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/logs" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <FileText className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Logs</span>
            </a>
          </Link>
          <Link href="/knowledge-base">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/knowledge-base" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <Database className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Knowledge</span>
            </a>
          </Link>
          <Link href="/analytics">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/analytics" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <BarChart2 className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Analytics</span>
            </a>
          </Link>
          <Link href="/care-team-management">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/care-team-management" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <Users className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Team</span>
            </a>
          </Link>
          <Link href="/settings">
            <a className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location === "/settings" ? "text-primary bg-primary/10" : "text-slate-600"}`}>
              <Settings className="h-5 w-5 stroke-2" />
              <span className="text-xs mt-1 font-medium">Settings</span>
            </a>
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-0 md:pt-0 mt-28 md:mt-0 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
