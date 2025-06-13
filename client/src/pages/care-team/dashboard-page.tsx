import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Chatbot } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import CareTeamLayout from "@/components/layouts/care-team-layout";
import { MessageSquare, Users, Activity } from "lucide-react";

export default function CareTeamDashboardPage() {
  // Get assigned chatbots
  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/care-team/chatbots"],
  });

  if (isLoading) {
    return (
      <CareTeamLayout>
        <div className="flex justify-center items-center h-96">
          <Loader size="lg" variant="primary" />
        </div>
      </CareTeamLayout>
    );
  }

  if (!chatbots || chatbots.length === 0) {
    return (
      <CareTeamLayout>
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold text-primary mb-6">Patient Care Dashboard</h1>
          
          <div className="bg-background-light border border-neutral-800 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-2">No Care Aids Assigned</h3>
              <p className="text-neutral-400 mb-6">
                You don't have any Care Aids assigned to you yet. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </CareTeamLayout>
    );
  }

  return (
    <CareTeamLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Patient Care Dashboard</h1>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Assigned Care Aids</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <Card 
                key={chatbot.id} 
                className="bg-background-light border border-neutral-800 hover:border-primary transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{chatbot.name}</h3>
                      <p className="text-xs text-neutral-500 font-mono">ID: {chatbot.id}</p>
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
                    {chatbot.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex space-x-4">
                      <Link 
                        href={`/care-team/logs?chatbotId=${chatbot.id}`}
                        className="flex items-center text-xs text-neutral-400 hover:text-primary"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat Logs
                      </Link>
                      <Link 
                        href={`/care-team/analytics?chatbotId=${chatbot.id}`}
                        className="flex items-center text-xs text-neutral-400 hover:text-primary"
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        Analytics
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-background-light border border-neutral-800 hover:border-primary transition-colors">
              <CardContent className="p-6">
                <Link href="/care-team/logs" className="flex flex-col items-center p-4">
                  <MessageSquare className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-lg font-semibold text-white mb-1">View All Chat Logs</h3>
                  <p className="text-neutral-400 text-sm text-center">
                    Access patient conversation history across all Care Aids
                  </p>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="bg-background-light border border-neutral-800 hover:border-primary transition-colors">
              <CardContent className="p-6">
                <Link href="/care-team/analytics" className="flex flex-col items-center p-4">
                  <Activity className="h-8 w-8 text-primary mb-2" />
                  <h3 className="text-lg font-semibold text-white mb-1">Care Aid Analytics</h3>
                  <p className="text-neutral-400 text-sm text-center">
                    View usage statistics for all assigned Care Aids
                  </p>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CareTeamLayout>
  );
}