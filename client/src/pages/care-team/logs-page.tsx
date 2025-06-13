import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
import CareTeamLayout from "@/components/layouts/care-team-layout";
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

export default function CareTeamLogsPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialChatbotId = searchParams.get('chatbotId') || "all";
  
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>(initialChatbotId);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});
  const [redactPII, setRedactPII] = useState<boolean>(true);
  const pageSize = 20;
  const { toast } = useToast();

  // Get all assigned chatbots for the filter dropdown
  const { data: chatbots, isLoading: loadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/care-team/chatbots"],
  });

  // Get chat logs with filters
  const { 
    data: logsData, 
    isLoading: loadingLogs,
    refetch: refetchLogs
  } = useQuery<{logs: ChatLog[], totalCount: number, redactionEnabled?: boolean}>({
    queryKey: ["/api/care-team/logs", selectedChatbotId, page, pageSize, searchTerm, dateRange, redactPII],
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
      const url = `/api/care-team/logs${queryString ? `?${queryString}` : ''}`;
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
        const messages = sessionMap[sessionId];
        const chatbotName = messages[0]?.chatbotName || "Unknown";

        pairs.forEach(pair => {
          // Skip welcome messages that aren't part of a user-bot exchange
          if (!pair.userMessage.isUser && !pair.botResponse) return;

          allPairs.push({
            timestamp: formatDate(new Date(pair.userMessage.timestamp)),
            chatbotName,
            sessionId,
            userMessage: pair.userMessage.isUser ? pair.userMessage.content : "", 
            botResponse: pair.botResponse ? pair.botResponse.content : ""
          });
        });
      });

      // Convert to CSV
      const headers = ["Timestamp", "Care Aid", "Session ID", "User Message", "Bot Response"];
      const csvContent = [
        headers.join(","),
        ...allPairs.map(pair => 
          [
            pair.timestamp,
            `"${pair.chatbotName.replace(/"/g, '""')}"`,
            pair.sessionId,
            `"${pair.userMessage.replace(/"/g, '""')}"`,
            `"${pair.botResponse.replace(/"/g, '""')}"`
          ].join(",")
        )
      ].join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `chat-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: "Chat logs have been exported to CSV",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export chat logs",
        variant: "destructive",
      });
    }
  };

  // Sort sessions by latest timestamp
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
    setRedactPII(true);
    setPage(1);
    refetchLogs();
  };

  if (loadingChatbots) {
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
          <h1 className="text-2xl font-bold text-primary mb-4 md:mb-0">Patient Conversation Logs</h1>
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
        <Card className="mb-6 bg-background-light border-neutral-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Care Aid Filter */}
              <div>
                <Label htmlFor="chatbot-filter" className="text-sm font-medium mb-1.5 block">
                  Care Aid
                </Label>
                <Select 
                  value={selectedChatbotId} 
                  onValueChange={setSelectedChatbotId}
                >
                  <SelectTrigger className="bg-background border-neutral-700">
                    <SelectValue placeholder="All Care Aids" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Care Aids</SelectItem>
                    {chatbots?.map(chatbot => (
                      <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                        {chatbot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Input */}
              <div>
                <Label htmlFor="search-filter" className="text-sm font-medium mb-1.5 block">
                  Search
                </Label>
                <div className="relative">
                  <Input
                    id="search-filter"
                    type="text"
                    placeholder="Search in messages"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background border-neutral-700 pr-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={handleSearch}
                  >
                    <SearchIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Date Range Filters */}
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium mb-1.5 block">
                  From Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start || ""}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-background border-neutral-700"
                />
              </div>

              <div>
                <Label htmlFor="end-date" className="text-sm font-medium mb-1.5 block">
                  To Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end || ""}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-background border-neutral-700"
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <Switch
                id="redact-toggle"
                checked={redactPII}
                onCheckedChange={setRedactPII}
              />
              <Label htmlFor="redact-toggle" className="ml-2 flex items-center text-sm text-white">
                <ShieldAlert className="h-4 w-4 mr-1 text-primary" />
                Redact Personal Information in All Messages
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Logs Display */}
        {loadingLogs ? (
          <div className="flex justify-center items-center h-96">
            <Loader size="lg" variant="primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-white">
            <p className="text-lg font-medium">No messages found</p>
            <p className="text-sm mt-2 text-neutral-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {sortedSessions.map(sessionId => {
              const pairs = conversationsBySession[sessionId];
              const firstMessage = sessionMap[sessionId][0];
              const latestMessage = sessionMap[sessionId][sessionMap[sessionId].length - 1];

              return (
                <Card key={sessionId} className="bg-background-light border-neutral-800">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-neutral-800">
                      <div>
                        <div className="flex items-center text-sm text-white">
                          <span className="font-medium">{firstMessage.chatbotName}</span>
                          <span className="mx-1.5 text-neutral-500">•</span>
                          <span className="text-neutral-400">Session ID: {sessionId}</span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {formatDate(new Date(latestMessage.timestamp))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pairs.map(pair => (
                        <div key={pair.id} className="space-y-4">
                          {/* User message or welcome message */}
                          <div className={`flex ${pair.userMessage.isUser ? 'justify-end' : ''}`}>
                            <div className="flex items-start max-w-[80%]">
                              {!pair.userMessage.isUser && (
                                <BotIcon className="h-8 w-8 text-primary mr-2 mt-0.5 shrink-0" />
                              )}
                              <div 
                                className={`rounded-2xl px-4 py-3 ${
                                  pair.userMessage.isUser 
                                    ? 'bg-primary text-white' 
                                    : 'bg-background text-white border border-neutral-800'
                                }`}
                              >
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {pair.userMessage.content}
                                </div>
                              </div>
                              {pair.userMessage.isUser && (
                                <UserCircle className="h-8 w-8 text-primary ml-2 mt-0.5 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Bot response (if exists) */}
                          {pair.botResponse && (
                            <div className="flex">
                              <div className="flex items-start max-w-[80%]">
                                <BotIcon className="h-8 w-8 text-primary mr-2 mt-0.5 shrink-0" />
                                <div className="bg-background text-white border border-neutral-800 rounded-2xl px-4 py-3">
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {pair.botResponse.content}
                                  </div>
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
          <Pagination className="mt-8">
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
                // Show current page and neighboring pages
                let pageNum = page;
                if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                // Ensure page number is within valid range
                if (pageNum < 1) pageNum = 1;
                if (pageNum > totalPages) pageNum = totalPages;
                
                return (
                  <PaginationItem key={i}>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNum);
                      }}
                      isActive={pageNum === page}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
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
    </CareTeamLayout>
  );
}