import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, TrendingUp, MessageSquare, Settings, LogOut, FileText } from "lucide-react";
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
    return location === path ? "bg-primary/20 hover:bg-primary/30 text-primary" : "hover:bg-neutral-800 text-neutral-100";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 bg-background-light border-r border-neutral-800 hidden md:block">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-neutral-800">
            <div className="hidden md:block text-xl font-semibold text-white">RAG Builder</div>
            <div className="block md:hidden text-center">
              <MessageSquare className="h-5 w-5" />
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
                <Link href="/chatbots">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/chatbots")}`}>
                    <MessageSquare className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Chatbots</span>
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
                <Link href="/settings">
                  <a className={`flex items-center p-2 rounded-lg ${isActive("/settings")}`}>
                    <Settings className="h-5 w-5" />
                    <span className="ml-3 hidden md:block">Settings</span>
                  </a>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="p-4 border-t border-neutral-800">
            <Button 
              variant="ghost" 
              className="w-full justify-start p-2 text-neutral-100"
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
      <div className="md:hidden fixed top-0 left-0 right-0 bg-background-light border-b border-neutral-800 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="text-xl font-semibold text-white">RAG Builder</div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        <Separator />
        <nav className="flex justify-around p-1">
          <Link href="/dashboard">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/dashboard" ? "text-primary" : "text-neutral-400"}`}>
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs mt-1">Dashboard</span>
            </a>
          </Link>
          <Link href="/chatbots">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/chatbots" ? "text-primary" : "text-neutral-400"}`}>
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs mt-1">Chatbots</span>
            </a>
          </Link>
          <Link href="/logs">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/logs" ? "text-primary" : "text-neutral-400"}`}>
              <FileText className="h-5 w-5" />
              <span className="text-xs mt-1">Logs</span>
            </a>
          </Link>
          <Link href="/settings">
            <a className={`flex flex-col items-center p-2 rounded-lg ${location === "/settings" ? "text-primary" : "text-neutral-400"}`}>
              <Settings className="h-5 w-5" />
              <span className="text-xs mt-1">Settings</span>
            </a>
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background pt-0 md:pt-0 mt-24 md:mt-0">
        {children}
      </main>
    </div>
  );
}
