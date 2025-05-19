import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Chatbot } from "@shared/schema";
import { Loader } from "@/components/ui/loader";
import CareTeamLayout from "@/components/layouts/care-team-layout";
import { formatNumber } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface CareAidStats {
  chatbotId: number;
  chatbotName: string;
  totalSessions: number;
  totalQueries: number;
  averageQueriesPerSession: number;
}

interface OverallStats {
  totalSessions: number;
  totalQueries: number;
  averageQueriesPerSession: number;
  chatbotBreakdown: {
    chatbotId: number;
    chatbotName: string;
    sessions: number;
    queries: number;
  }[];
}

export default function CareTeamAnalyticsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialChatbotId = searchParams.get('chatbotId') || "all";
  
  const [selectedChatbotId, setSelectedChatbotId] = useState(initialChatbotId);
  const [timeframe, setTimeframe] = useState("all");
  
  // Get assigned chatbots
  const { data: chatbots, isLoading: loadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/care-team/chatbots"],
  });
  
  // Get analytics data
  const { 
    data: analyticsData, 
    isLoading: loadingAnalytics 
  } = useQuery<{
    overallStats?: OverallStats;
    careAidStats: CareAidStats[];
  }>({
    queryKey: ["/api/care-team/analytics", selectedChatbotId, timeframe],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedChatbotId !== "all") {
        params.append("chatbotId", selectedChatbotId);
      }
      params.append("timeframe", timeframe);
      
      const response = await fetch(`/api/care-team/analytics?${params.toString()}`);
      return await response.json();
    },
  });
  
  const overallStats = analyticsData?.overallStats;
  const careAidStats = analyticsData?.careAidStats || [];
  
  // Display colors for the chart
  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981'];
  
  // Prepare data for sessions pie chart
  const sessionsData = overallStats?.chatbotBreakdown.map(item => ({
    name: item.chatbotName,
    value: item.sessions,
  })) || [];
  
  if (loadingChatbots || loadingAnalytics) {
    return (
      <CareTeamLayout>
        <div className="flex justify-center items-center h-96">
          <Loader size="lg" variant="primary" />
        </div>
      </CareTeamLayout>
    );
  }
  
  return (
    <CareTeamLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-4 md:mb-0">Patient Care Analytics</h1>
          <div className="flex gap-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[150px] text-white">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="today">Today</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Overall Stats */}
        {selectedChatbotId === "all" && overallStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-background-light border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-neutral-400 text-sm font-normal">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{formatNumber(overallStats.totalSessions)}</div>
              </CardContent>
            </Card>
            <Card className="bg-background-light border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-neutral-400 text-sm font-normal">Total Patient Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{formatNumber(overallStats.totalQueries)}</div>
              </CardContent>
            </Card>
            <Card className="bg-background-light border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-neutral-400 text-sm font-normal">Avg. Queries per Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{overallStats.averageQueriesPerSession.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Sessions Distribution Chart */}
        {selectedChatbotId === "all" && overallStats && sessionsData.length > 0 && (
          <Card className="bg-background-light border-neutral-800 mb-6">
            <CardHeader>
              <CardTitle>Sessions by Care Aid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sessionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatNumber(value), "Sessions"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Care Aid Selection */}
        <Card className="bg-background-light border-neutral-800 mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Care Aid Details</CardTitle>
            <div className="mt-4 sm:mt-0">
              <Select value={selectedChatbotId} onValueChange={setSelectedChatbotId}>
                <SelectTrigger className="w-[220px] text-white">
                  <SelectValue placeholder="Filter by Care Aid" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="px-3 py-2">
                    <input 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-white font-medium shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Search care aids..."
                      onChange={(e) => {
                        const searchInput = document.getElementById('care-aid-search-input');
                        if (searchInput) {
                          searchInput.focus();
                        }
                        
                        // Hide/show items based on search
                        const value = e.target.value.toLowerCase();
                        const items = document.querySelectorAll('[data-care-aid-search-item]');
                        items.forEach((item) => {
                          const text = item.textContent?.toLowerCase() || '';
                          if (text.includes(value)) {
                            (item as HTMLElement).style.display = '';
                          } else {
                            (item as HTMLElement).style.display = 'none';
                          }
                        });
                      }}
                      id="care-aid-search-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="all" data-care-aid-search-item>All Care Aids</SelectItem>
                  {chatbots?.map((chatbot) => (
                    <SelectItem key={chatbot.id} value={chatbot.id.toString()} data-care-aid-search-item>
                      {chatbot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left p-3 text-sm font-medium text-neutral-400">Care Aid</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-400">Sessions</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-400">Queries</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-400">Avg. Queries/Session</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChatbotId === "all" ? (
                    careAidStats?.map((stat) => (
                      <tr key={stat.chatbotId} className="border-b border-neutral-700">
                        <td className="text-left p-3 text-white">{stat.chatbotName}</td>
                        <td className="text-right p-3 text-white">{stat.totalSessions}</td>
                        <td className="text-right p-3 text-white">{stat.totalQueries}</td>
                        <td className="text-right p-3 text-white">{stat.averageQueriesPerSession.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    careAidStats?.filter(stat => stat.chatbotId.toString() === selectedChatbotId).map((stat) => (
                      <tr key={stat.chatbotId} className="border-b border-neutral-700">
                        <td className="text-left p-3 text-white">{stat.chatbotName}</td>
                        <td className="text-right p-3 text-white">{stat.totalSessions}</td>
                        <td className="text-right p-3 text-white">{stat.totalQueries}</td>
                        <td className="text-right p-3 text-white">{stat.averageQueriesPerSession.toFixed(1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* No Data Message */}
        {careAidStats.length === 0 && (
          <div className="text-center py-12 bg-background-light border border-neutral-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data Available</h3>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              There is no conversation data available for the selected Care Aid(s) in this time period.
            </p>
          </div>
        )}
      </div>
    </CareTeamLayout>
  );
}