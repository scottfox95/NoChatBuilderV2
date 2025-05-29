import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Chatbot } from "@shared/schema";
import ChatbotCard from "./chatbot-card";
import ChatbotBuilderModal from "@/components/modals/chatbot-builder-modal";

export default function ChatbotList() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingChatbotId, setEditingChatbotId] = useState<number | null>(null);

  const { data: chatbots, isLoading, error } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const handleOpenCreateModal = () => {
    setEditingChatbotId(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (id: number) => {
    setEditingChatbotId(id);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingChatbotId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" withText text="Loading chatbots..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg p-4 mt-4">
        <h3 className="font-semibold mb-2">Error loading chatbots</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">My Care Aids</h1>
            <p className="text-slate-600">
              Manage and monitor your AI-powered healthcare assistants
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm mt-4 sm:mt-0" 
            onClick={handleOpenCreateModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Care Aid
          </Button>
        </div>
        
        {/* Chatbot List Grid */}
        {chatbots && chatbots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <ChatbotCard 
                key={chatbot.id} 
                chatbot={chatbot} 
                onEdit={handleOpenEditModal}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Care Aids Yet</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Create your first Care Aid to start building conversational AI with document-based knowledge for your healthcare team.
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90 text-white font-medium shadow-sm" 
                onClick={handleOpenCreateModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Care Aid
              </Button>
            </div>
          </div>
        )}
      </div>

      <ChatbotBuilderModal 
        isOpen={isCreateModalOpen} 
        onClose={handleCloseModal} 
        chatbotId={editingChatbotId}
      />
    </>
  );
}
