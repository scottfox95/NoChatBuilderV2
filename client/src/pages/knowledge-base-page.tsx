import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document, Chatbot } from "@shared/schema"; 
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { File, Search, FileText, Tag } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCareAid, setSelectedCareAid] = useState<string>("all");
  
  // Fetch all chatbots/care aids
  const { data: careAids, isLoading: careAidsLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });
  
  // Fetch all documents
  const { data: allDocuments, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  
  // Filter documents based on search query and selected care aid
  const filteredDocuments = allDocuments?.filter(document => {
    const matchesSearch = searchQuery === "" || 
      document.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCareAid = selectedCareAid === "all" || 
      document.chatbotId.toString() === selectedCareAid;
    
    return matchesSearch && matchesCareAid;
  });
  
  // Get care aid name by id
  const getCareAidNameById = (id: number): string => {
    const careAid = careAids?.find(c => c.id === id);
    return careAid ? careAid.name : "Unknown Care Aid";
  };
  
  // Get file type icon based on file extension
  const getFileTypeIcon = (name: string) => {
    const extension = name.split('.').pop()?.toLowerCase();
    
    switch(extension) {
      case 'pdf':
        return <File className="h-6 w-6 text-red-500" />;
      case 'txt':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-6 w-6 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-6 w-6 text-orange-500" />;
      default:
        return <FileText className="h-6 w-6 text-neutral-500" />;
    }
  };
  
  if (careAidsLoading || documentsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader size="lg" variant="primary" withText text="Loading knowledge base documents..." />
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Knowledge Base Documents</h1>
            <p className="text-neutral-400">
              Browse and filter all documents used across your Care Aids
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-background-light border border-neutral-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={selectedCareAid}
                onValueChange={setSelectedCareAid}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Care Aid" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Care Aids</SelectItem>
                  {careAids?.map((careAid) => (
                    <SelectItem key={careAid.id} value={careAid.id.toString()}>
                      {careAid.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Documents List */}
        {filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="bg-background-light border-neutral-800 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {getFileTypeIcon(document.name)}
                      <div className="ml-2">
                        <CardTitle className="text-lg text-white truncate max-w-[200px]">
                          {document.name}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-neutral-300 mb-2">
                    Added on {formatDate(document.createdAt)}
                  </div>
                  <div className="flex items-center mt-3">
                    <Tag className="h-4 w-4 text-primary mr-2" />
                    <Badge variant="outline" className="text-primary border-primary/30">
                      {getCareAidNameById(document.chatbotId)}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-neutral-800 pt-3">
                  <div className="flex justify-between w-full">
                    <Link href={`/care-aid/${getCareAidById(document.chatbotId)?.slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-neutral-700 text-neutral-300"
                      >
                        View Care Aid
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-neutral-300"
                      onClick={() => {
                        toast({
                          title: "Document details",
                          description: `Filename: ${document.name}, Size: ${document.size} bytes`,
                        });
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-background-light border border-neutral-800 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No documents found</h3>
            <p className="text-neutral-300 mb-4">
              {searchQuery || selectedCareAid !== "all"
                ? "No documents match your current filters. Try adjusting your search criteria."
                : "Upload documents to your Care Aids to enhance their knowledge base."}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
  
  // Helper function to get care aid by id
  function getCareAidById(id: number): Chatbot | undefined {
    return careAids?.find(c => c.id === id);
  }
}