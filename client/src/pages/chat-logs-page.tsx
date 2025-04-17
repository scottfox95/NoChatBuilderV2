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
import { SearchIcon, UserCircle, BotIcon, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const pageSize = 20;
  
  // Get all chatbots for the filter dropdown
  const { data: chatbots, isLoading: loadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });
  
  // Get chat logs with filters
  const { 
    data: logsData, 
    isLoading: loadingLogs,
    refetch: refetchLogs
  } = useQuery<{logs: ChatLog[], totalCount: number}>({
    queryKey: ["/api/logs", selectedChatbotId, page, pageSize, searchTerm, dateRange],
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
          <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">Chat Logs</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="text-sm h-9"
            >
              Reset Filters
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 bg-background-light border-neutral-800">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chatbot-filter" className="mb-2 block text-sm font-medium text-neutral-300">
                  Chatbot
                </Label>
                <Select
                  value={selectedChatbotId}
                  onValueChange={(value) => setSelectedChatbotId(value)}
                >
                  <SelectTrigger id="chatbot-filter" className="w-full bg-background border-neutral-700">
                    <SelectValue placeholder="All Chatbots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chatbots</SelectItem>
                    {chatbots?.map((chatbot) => (
                      <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                        {chatbot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-start" className="mb-2 block text-sm font-medium text-neutral-300">
                  Start Date
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  className="bg-background border-neutral-700"
                  value={dateRange.start || ""}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="date-end" className="mb-2 block text-sm font-medium text-neutral-300">
                  End Date
                </Label>
                <Input
                  id="date-end"
                  type="date"
                  className="bg-background border-neutral-700"
                  value={dateRange.end || ""}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  className="pl-10 bg-background border-neutral-700"
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
          <div className="text-center py-16 text-neutral-400">
            <p className="text-lg">No messages found</p>
            <p className="text-sm mt-2">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {sortedSessions.map(sessionId => {
              const pairs = conversationsBySession[sessionId];
              const firstMessage = sessionMap[sessionId][0];
              const latestMessage = sessionMap[sessionId][sessionMap[sessionId].length - 1];
              
              return (
                <Card key={sessionId} className="bg-background-light border-neutral-800 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Session Header */}
                    <div className="border-b border-neutral-800 bg-background-darker px-4 py-3 flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center">
                        <span className="bg-neutral-800 text-xs text-neutral-400 px-2 py-1 rounded mr-3">
                          {formatDate(latestMessage.timestamp)}
                        </span>
                        <span className="text-primary text-sm font-medium">
                          {firstMessage.chatbotName}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-neutral-500">
                          Session: {sessionId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                    
                    {/* Conversation Pairs */}
                    <div className="p-4 flex flex-col gap-4">
                      {pairs.map(pair => (
                        <div key={pair.id} className="border border-neutral-800 rounded-lg overflow-hidden">
                          {/* User Message */}
                          <div className="flex items-start gap-3 p-4 border-b border-neutral-800 bg-background-darker/30">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center">
                              <UserCircle className="h-5 w-5 text-neutral-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <div className="font-medium text-white">
                                  {pair.userMessage.isUser ? "User" : "Bot"}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {formatDate(pair.userMessage.timestamp)}
                                </div>
                              </div>
                              <div className="text-neutral-300 text-sm whitespace-pre-wrap">
                                {pair.userMessage.content}
                              </div>
                            </div>
                          </div>
                          
                          {/* Bot Response (if available) */}
                          {pair.botResponse && (
                            <div className="flex items-start gap-3 p-4 bg-background-dark/40">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                                <BotIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-medium text-white">Bot</div>
                                  <div className="text-xs text-neutral-500">
                                    {formatDate(pair.botResponse.timestamp)}
                                  </div>
                                </div>
                                <div className="text-neutral-300 text-sm whitespace-pre-wrap">
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