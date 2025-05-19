import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, TrendingUp, MessageSquare, Settings, LogOut, FileText, Database, BarChart2, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
    return location === path ? "bg-primary/20 hover:bg-primary/30 text-primary" : "hover:bg-white/50 text-black";
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F4F4F4' }}>
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 border-r border-neutral-300 hidden md:block" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-neutral-300">
            <div className="hidden md:block text-xl font-semibold text-black">
              <span style={{ color: 'var(--primary-accent)' }}>Aidify</span>
            </div>
            <div className="block md:hidden text-center">
              <MessageSquare className="h-5 w-5" style={{ color: 'var(--primary-accent)' }} />
            </div>
          </div>
          
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/dashboard")}`}>
                    <TrendingUp className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/care-aids">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/care-aids")}`}>
                    <MessageSquare className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Care Aids</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/logs">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/logs")}`}>
                    <FileText className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Chat Logs</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/knowledge-base">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/knowledge-base")}`}>
                    <Database className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Knowledge Base</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/analytics">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/analytics")}`}>
                    <BarChart2 className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Analytics</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/care-team-management">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/care-team-management")}`}>
                    <Users className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Care Team Users</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/settings">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/settings")}`}>
                    <Settings className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Settings</span>
                  </a>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 border-t border-neutral-300">
            <Button 
              variant="ghost" 
              className="w-full justify-start p-2 text-black"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              <span className="ml-3 hidden md:block">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 border-b border-neutral-300 z-50" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="flex items-center justify-between p-4">
          <div className="text-xl font-semibold text-black">
            <span style={{ color: 'var(--primary-accent)' }}>Aidify</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5 text-black" />
              )}
            </Button>
          </div>
        </div>
        <Separator className="bg-neutral-300" />
        <nav className="flex justify-around p-1">
          <Link href="/dashboard">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/dashboard" ? "text-primary" : "text-black"}`}>
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs mt-1">Dashboard</span>
            </a>
          </Link>
          <Link href="/care-aids">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/care-aids" ? "text-primary" : "text-black"}`}>
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs mt-1">Care Aids</span>
            </a>
          </Link>
          <Link href="/logs">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/logs" ? "text-primary" : "text-black"}`}>
              <FileText className="h-5 w-5" />
              <span className="text-xs mt-1">Logs</span>
            </a>
          </Link>
          <Link href="/knowledge-base">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/knowledge-base" ? "text-primary" : "text-black"}`}>
              <Database className="h-5 w-5" />
              <span className="text-xs mt-1">Knowledge</span>
            </a>
          </Link>
          <Link href="/analytics">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/analytics" ? "text-primary" : "text-black"}`}>
              <BarChart2 className="h-5 w-5" />
              <span className="text-xs mt-1">Analytics</span>
            </a>
          </Link>
          <Link href="/care-team-management">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/care-team-management" ? "text-primary" : "text-black"}`}>
              <Users className="h-5 w-5" />
              <span className="text-xs mt-1">Team</span>
            </a>
          </Link>
          <Link href="/settings">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/settings" ? "text-primary" : "text-black"}`}>
              <Settings className="h-5 w-5" />
              <span className="text-xs mt-1">Settings</span>
            </a>
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-0 md:pt-0 mt-24 md:mt-0" style={{ backgroundColor: '#F4F4F4' }}>
        {children}
      </main>
    </div>
  );
}
