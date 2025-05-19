import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, LayoutGrid, BarChart2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface CareTeamLayoutProps {
  children: ReactNode;
}

export default function CareTeamLayout({ children }: CareTeamLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const navigation = [
    {
      name: "Dashboard",
      href: "/care-team/dashboard",
      icon: LayoutGrid,
      current: location === "/care-team/dashboard"
    },
    {
      name: "Chat Logs",
      href: "/care-team/logs",
      icon: MessageSquare,
      current: location.startsWith("/care-team/logs")
    },
    {
      name: "Analytics",
      href: "/care-team/analytics",
      icon: BarChart2,
      current: location.startsWith("/care-team/analytics")
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background border-neutral-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-primary tracking-tight">
              Patient Care Portal
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">{user.username}</p>
                <p className="text-xs text-neutral-400">Care Team Member</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-400 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar (mobile at top, desktop at left) */}
        <div className="md:w-64 flex-shrink-0 bg-background md:border-r border-neutral-800">
          {/* Mobile navigation */}
          <div className="md:hidden border-b border-neutral-800 bg-background-light">
            <div className="flex overflow-x-auto py-4 px-2 space-x-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex-shrink-0 flex items-center px-4 py-2 rounded-lg font-medium ${
                    item.current
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-400 hover:bg-background-lighter hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-2" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Desktop sidebar navigation */}
          <nav className="hidden md:block py-6 px-2 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
            <div className="mb-8 px-4">
              <h2 className="text-lg font-bold text-white mb-1">Care Team Portal</h2>
              <p className="text-sm text-neutral-400">
                View and analyze patient care data
              </p>
            </div>
            <div className="space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-400 hover:bg-background-lighter hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      item.current ? "text-primary" : "text-neutral-400 group-hover:text-white"
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}