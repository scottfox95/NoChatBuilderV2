import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader } from "@/components/ui/loader";
import { Chatbot } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function AnalyticsPage() {
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");

  // Fetch chatbots for the dropdown
  const { data: chatbots, isLoading: chatbotsLoading } = useQuery<Chatbot[]>({
    queryKey: ['/api/chatbots'],
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    overallStats: OverallStats,
    careAidStats: CareAidStats[]
  }>({
    queryKey: ['/api/analytics', selectedChatbotId, timeframe],
    enabled: !!selectedChatbotId,
  });

  if (chatbotsLoading || analyticsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader size="lg" variant="primary" withText text="Loading analytics data..." />
        </div>
      </DashboardLayout>
    );
  }

  const overallStats = analyticsData?.overallStats;
  const careAidStats = analyticsData?.careAidStats;

  // Prepare data for charts
  const sessionsData = careAidStats?.map(stat => ({
    name: stat.chatbotName,
    sessions: stat.totalSessions,
  })) || [];

  const queriesData = careAidStats?.map(stat => ({
    name: stat.chatbotName,
    queries: stat.totalQueries,
  })) || [];

  const pieData = overallStats?.chatbotBreakdown.map(item => ({
    name: item.chatbotName,
    value: item.sessions,
  })) || [];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-black mb-1">Analytics Dashboard</h1>
            <p className="text-neutral-500">
              Monitor your Care Aids activity and performance
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px] text-gray-900">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallStats?.totalSessions || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">
                Total user conversation sessions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Total Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overallStats?.totalQueries || 0}</div>
              <p className="text-xs text-neutral-500 mt-1">
                Total questions asked across all Care Aids
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Avg. Queries/Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {overallStats?.averageQueriesPerSession.toFixed(1) || "0.0"}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Average number of queries per session
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="w-full mb-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Care Aid Activity Overview</CardTitle>
                  <CardDescription>Session distribution across Care Aids</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-neutral-500">No data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Sessions by Care Aid</CardTitle>
                <CardDescription>Number of conversation sessions per Care Aid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {sessionsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sessions" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-500">No session data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queries">
            <Card>
              <CardHeader>
                <CardTitle>Queries by Care Aid</CardTitle>
                <CardDescription>Number of questions asked per Care Aid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {queriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={queriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="queries" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-500">No query data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Care Aid Specific Stats Table */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Care Aid Performance</CardTitle>
              <CardDescription>Detailed performance metrics for each Care Aid</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0">
              <Select value={selectedChatbotId} onValueChange={setSelectedChatbotId}>
                <SelectTrigger className="w-[220px] text-gray-600">
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
                  <tr className="border-b border-neutral-300">
                    <th className="text-left p-3 text-sm font-medium text-neutral-500">Care Aid</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-500">Sessions</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-500">Queries</th>
                    <th className="text-right p-3 text-sm font-medium text-neutral-500">Avg. Queries/Session</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChatbotId === "all" ? (
                    careAidStats?.map((stat) => (
                      <tr key={stat.chatbotId} className="border-b border-neutral-300">
                        <td className="text-left p-3">{stat.chatbotName}</td>
                        <td className="text-right p-3">{stat.totalSessions}</td>
                        <td className="text-right p-3">{stat.totalQueries}</td>
                        <td className="text-right p-3">{stat.averageQueriesPerSession.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    careAidStats?.filter(stat => stat.chatbotId.toString() === selectedChatbotId).map((stat) => (
                      <tr key={stat.chatbotId} className="border-b border-neutral-300">
                        <td className="text-left p-3">{stat.chatbotName}</td>
                        <td className="text-right p-3">{stat.totalSessions}</td>
                        <td className="text-right p-3">{stat.totalQueries}</td>
                        <td className="text-right p-3">{stat.averageQueriesPerSession.toFixed(1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}