import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Chatbot } from "@shared/schema";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import ChatInterface from "@/components/chat/chat-interface";
import ShareEmbedModal from "@/components/modals/share-embed-modal";
import DocumentUploadModal from "@/components/modals/document-upload-modal";
import { useAuth } from "@/hooks/use-auth";

export default function CareAidPage() {
  const [, navigate] = useLocation();
  const [isEmbedView, setIsEmbedView] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [match, params] = useRoute("/care-aid/:slug/:view?");
  const { user } = useAuth();
  
  const slug = params?.slug || "";
  const view = params?.view || "";
  
  useEffect(() => {
    if (view === "embed") {
      setIsEmbedView(true);
    }
  }, [view]);

  // Get chatbot information
  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/public/chatbot/${slug}`],
    enabled: !!slug,
  });

  // Check if the logged-in user is the owner
  const isOwner = user && chatbot && user.id === chatbot.userId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader size="lg" variant="primary" withText text="Loading Care Aid..." />
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Care Aid Not Found</h1>
          <p className="text-neutral-400 mb-6">
            The Care Aid you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary-dark">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return Home
          </Button>
        </div>
      </div>
    );
  }

  // For embed view, only show the chat interface
  if (isEmbedView) {
    return (
      <div className="h-screen bg-background p-0">
        <ChatInterface chatbotSlug={slug} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-background-light">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")}
                className="md:mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-white">{chatbot.name}</h1>
            </div>
            {chatbot.description && (
              <p className="text-sm text-neutral-400 mt-1 ml-12 md:ml-10">
                {chatbot.description}
              </p>
            )}
          </div>
          
          <div className="flex gap-2 ml-12 md:ml-0">
            {isOwner && (
              <Button 
                variant="outline" 
                className="border-neutral-700 text-neutral-200"
                onClick={() => setIsDocumentModalOpen(true)}
              >
                Manage Documents
              </Button>
            )}
            <Button 
              className="bg-primary hover:bg-primary-dark"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-[75vh] md:h-[70vh]">
            <ChatInterface chatbotSlug={slug} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-neutral-800 py-4 text-center text-sm text-neutral-500">
        <div className="container mx-auto px-4">
          <p>Powered by Aidify | Built with OpenAI's Responses API</p>
        </div>
      </footer>
      
      {/* Modals */}
      <ShareEmbedModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        careAidSlug={slug}
      />
      
      {isOwner && (
        <DocumentUploadModal 
          isOpen={isDocumentModalOpen} 
          onClose={() => setIsDocumentModalOpen(false)} 
          chatbotId={chatbot.id}
        />
      )}
    </div>
  );
}
