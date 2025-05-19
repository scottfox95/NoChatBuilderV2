import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, LogOut, BarChart2, HomeIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CareTeamLayoutProps {
  children: ReactNode;
}

export default function CareTeamLayout({ children }: CareTeamLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/care-team/dashboard",
      icon: HomeIcon,
      active: location === "/care-team/dashboard",
    },
    {
      name: "Chat Logs",
      href: "/care-team/logs",
      icon: MessageSquare,
      active: location === "/care-team/logs",
    },
    {
      name: "Analytics",
      href: "/care-team/analytics",
      icon: BarChart2,
      active: location === "/care-team/analytics",
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-background-light border-r border-neutral-800">
        <div className="p-4 flex items-center space-x-2">
          <img src="/assets/aidify-logo.png" alt="Aidify Logo" className="h-8" />
          <div>
            <h1 className="text-lg font-semibold text-white">Patient Care</h1>
            <p className="text-xs text-neutral-400">Data Portal</p>
          </div>
        </div>
        
        <Separator className="bg-neutral-800" />
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      item.active
                        ? "bg-primary text-white"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-neutral-400">Care Team</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-background-light border-b border-neutral-800 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/assets/aidify-logo.png" alt="Aidify Logo" className="h-6" />
            <h1 className="text-base font-semibold text-white">Patient Care Portal</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="flex border-t border-neutral-800">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} className="flex-1">
              <a
                className={`flex flex-col items-center py-2 text-xs font-medium ${
                  item.active
                    ? "text-primary"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 mb-1" />
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 md:pt-0 pt-24 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}