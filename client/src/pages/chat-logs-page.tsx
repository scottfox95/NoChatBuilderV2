import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chatbot, Message } from "@shared/schema";
import { Loader } from "@/components/ui/loader";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { formatDate } from "@/lib/utils";
import { SearchIcon, UserCircle, BotIcon, Filter, Download, ShieldAlert } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface ChatLog extends Message {
  chatbotName: string;
  timestamp: Date;
}

interface ConversationPair {
  id: string;
  userMessage: ChatLog;
  botResponse?: ChatLog;
}

export default function ChatLogsPage() {
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});
  const [redactPII, setRedactPII] = useState<boolean>(false);
  const pageSize = 20;
  const { toast } = useToast();

  // Get all chatbots for the filter dropdown
  const { data: chatbots, isLoading: loadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  // Get chat logs with filters
  const { 
    data: logsData, 
    isLoading: loadingLogs,
    refetch: refetchLogs
  } = useQuery<{logs: ChatLog[], totalCount: number, redactionEnabled?: boolean}>({
    queryKey: ["/api/logs", selectedChatbotId, page, pageSize, searchTerm, dateRange, redactPII],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedChatbotId !== "all") {
        params.append("chatbotId", selectedChatbotId);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (dateRange.start) {
        params.append("startDate", dateRange.start);
      }
      if (dateRange.end) {
        params.append("endDate", dateRange.end);
      }
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      params.append("redact", redactPII.toString());

      const queryString = params.toString();
      const url = `/api/logs${queryString ? `?${queryString}` : ''}`;
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  const logs = logsData?.logs || [];
  const totalCount = logsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Group messages by session and create conversation pairs
  const processLogsIntoPairs = () => {
    // Group messages by session ID
    const sessionMap: Record<string, ChatLog[]> = {};
    logs.forEach(log => {
      if (!sessionMap[log.sessionId]) {
        sessionMap[log.sessionId] = [];
      }
      sessionMap[log.sessionId].push(log);
    });

    // Sort each session by timestamp
    Object.keys(sessionMap).forEach(sessionId => {
      sessionMap[sessionId].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    // Create conversation pairs (user question + bot response)
    const conversationsBySession: Record<string, ConversationPair[]> = {};

    Object.keys(sessionMap).forEach(sessionId => {
      const messages = sessionMap[sessionId];
      const pairs: ConversationPair[] = [];

      for (let i = 0; i < messages.length; i++) {
        const current = messages[i];

        if (current.isUser) {
          // Find next bot response if available
          const nextMessage = i + 1 < messages.length ? messages[i + 1] : undefined;

          pairs.push({
            id: `${current.id}-${nextMessage?.id || 'none'}`,
            userMessage: current,
            botResponse: nextMessage && !nextMessage.isUser ? nextMessage : undefined
          });

          // Skip the bot response since we've included it
          if (nextMessage && !nextMessage.isUser) {
            i++;
          }
        } else if (i === 0 || messages[i - 1].isUser) {
          // Bot message without a user query (welcome message)
          pairs.push({
            id: `bot-only-${current.id}`,
            userMessage: current,
            botResponse: undefined
          });
        }
      }

      conversationsBySession[sessionId] = pairs;
    });

    return { sessionMap, conversationsBySession };
  };

  const { sessionMap, conversationsBySession } = processLogsIntoPairs();

  // Handle export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    try {
      // Process logs to pair user questions with bot responses
      // Get conversation pairs just like in the display
      const { sessionMap, conversationsBySession } = processLogsIntoPairs();
      const allPairs: {
        timestamp: string;
        chatbotName: string;
        sessionId: string;
        userMessage: string;
        botResponse: string;
      }[] = [];

      // Format all conversation pairs for CSV
      Object.keys(sessionMap).forEach(sessionId => {
        const pairs = conversationsBySession[sessionId];

        pairs.forEach(pair => {
          // Skip welcome messages that aren't part of a user-bot exchange
          if (!pair.userMessage.isUser && !pair.botResponse) return;

          // For user messages, capture the pair
          allPairs.push({
            timestamp: new Date(pair.userMessage.timestamp).toISOString(),
            chatbotName: pair.userMessage.chatbotName,
            sessionId: pair.userMessage.sessionId,
            userMessage: pair.userMessage.isUser ? pair.userMessage.content : "", // User question
            botResponse: pair.botResponse ? pair.botResponse.content : ""         // Bot answer
          });
        });
      });

      // CSV Header
      const headers = ["Timestamp", "Chatbot", "Session ID", "User Question", "Bot Response"];

      // Format as CSV rows
      const csvRows = [
        headers.join(","), // header row
        ...allPairs.map(pair => {
          // Escape commas and quotes in content
          const userMessage = pair.userMessage.replace(/"/g, '""');
          const botResponse = pair.botResponse.replace(/"/g, '""');

          return [
            pair.timestamp,
            `"${pair.chatbotName}"`,
            pair.sessionId,
            `"${userMessage}"`,
            `"${botResponse}"`
          ].join(",");
        })
      ];

      // Join rows with newlines
      const csvContent = csvRows.join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Set up download attributes
      const currentDate = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `chat-logs-${currentDate}.csv`);

      // Trigger download and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Export Complete",
        description: `${allPairs.length} conversation pairs exported successfully.`,
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the CSV file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Sort sessions by latest message timestamp (newest first)
  const sortedSessions = Object.keys(sessionMap).sort((a, b) => {
    const aMessages = sessionMap[a];
    const bMessages = sessionMap[b];

    const aLatest = new Date(aMessages[aMessages.length - 1].timestamp).getTime();
    const bLatest = new Date(bMessages[bMessages.length - 1].timestamp).getTime();

    return bLatest - aLatest;
  });

  const handleSearch = () => {
    setPage(1);
    refetchLogs();
  };

  const handleReset = () => {
    setSelectedChatbotId("all");
    setSearchTerm("");
    setDateRange({});
    setPage(1);
    refetchLogs();
  };

  if (loadingChatbots) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader size="lg" variant="primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-black mb-4 md:mb-0">Chat Logs</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="text-sm h-9"
            >
              Reset Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              className="text-sm h-9 bg-primary/10 hover:bg-primary/20 border-primary/30"
              disabled={loadingLogs || logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chatbot-filter" className="mb-2 block text-sm font-medium text-gray-900">
                  Care Aid
                </Label>
                <Select
                  value={selectedChatbotId}
                  onValueChange={(value) => setSelectedChatbotId(value)}
                >
                  <SelectTrigger id="chatbot-filter" className="w-full bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="All Care Aids" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Care Aids</SelectItem>
                    {chatbots?.map((chatbot) => (
                      <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                        {chatbot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-start" className="mb-2 block text-sm font-medium text-gray-900">
                  Start Date
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  className="bg-white border-gray-300"
                  value={dateRange.start || ""}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="date-end" className="mb-2 block text-sm font-medium text-gray-900">
                  End Date
                </Label>
                <Input
                  id="date-end"
                  type="date"
                  className="bg-white border-gray-300"
                  value={dateRange.end || ""}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search messages..."
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>
              <Button onClick={handleSearch} className="bg-primary hover:bg-primary-dark">
                <Filter className="h-4 w-4 mr-2" /> Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Display */}
        {loadingLogs ? (
          <div className="flex justify-center items-center h-96">
            <Loader size="lg" variant="primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-lg font-medium">No messages found</p>
            <p className="text-sm mt-2">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {sortedSessions.map(sessionId => {
              const pairs = conversationsBySession[sessionId];
              const firstMessage = sessionMap[sessionId][0];
              const latestMessage = sessionMap[sessionId][sessionMap[sessionId].length - 1];

              return (
                <Card key={sessionId} className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    {/* Session Header */}
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center">
                        <span className="bg-gray-200 text-xs text-gray-800 px-2 py-1 rounded mr-3">
                          {formatDate(latestMessage.timestamp)}
                        </span>
                        <span className="text-primary text-sm font-medium">
                          {firstMessage.chatbotName}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-600">
                          Session: {sessionId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {/* Conversation Pairs */}
                    <div className="p-4 flex flex-col gap-4">
                      {pairs.map(pair => (
                        <div key={pair.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* User Message */}
                          <div className="flex items-start gap-3 p-4 border-b border-gray-200 bg-gray-50">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                              <UserCircle className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <div className="font-medium text-gray-900">
                                  {pair.userMessage.isUser ? "User" : "Care Aid"}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatDate(pair.userMessage.timestamp)}
                                </div>
                              </div>
                              <div className="text-gray-800 text-sm whitespace-pre-wrap">
                                {pair.userMessage.content}
                              </div>
                            </div>
                          </div>

                          {/* Bot Response (if available) */}
                          {pair.botResponse && (
                            <div className="flex items-start gap-3 p-4 bg-white">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                                <BotIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-medium text-gray-900">Care Aid</div>
                                  <div className="text-xs text-gray-600">
                                    {formatDate(pair.botResponse.timestamp)}
                                  </div>
                                </div>
                                <div className="text-gray-800 text-sm whitespace-pre-wrap">
                                  {pair.botResponse.content}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination className="my-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show at most 5 page links
                let pageToShow = i + 1;
                if (totalPages > 5) {
                  if (page > 3) {
                    pageToShow = page - 3 + i;
                  }
                  if (page > totalPages - 2) {
                    pageToShow = totalPages - 4 + i;
                  }
                }

                if (pageToShow <= totalPages) {
                  return (
                    <PaginationItem key={pageToShow}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageToShow);
                        }}
                        isActive={page === pageToShow}
                      >
                        {pageToShow}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </DashboardLayout>
  );
}