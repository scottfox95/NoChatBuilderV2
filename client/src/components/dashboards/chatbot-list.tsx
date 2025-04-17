import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
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
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Tabbed Navigation for Main Content */}
        <div className="mb-8">
          <div className="border-b border-neutral-800">
            <nav className="flex -mb-px space-x-8">
              <a href="#" className="border-b-2 border-primary py-4 px-1 text-sm font-medium text-primary whitespace-nowrap">
                My Chatbots
              </a>
              <a href="#" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-neutral-400 hover:text-neutral-300 whitespace-nowrap" onClick={handleOpenCreateModal}>
                Create New
              </a>
            </nav>
          </div>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 sm:mb-0">My Chatbots</h1>
          <Button className="bg-primary hover:bg-primary-dark text-white" onClick={handleOpenCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Chatbot
          </Button>
        </div>
        
        {/* Chatbot List Grid */}
        {chatbots && chatbots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <ChatbotCard 
                key={chatbot.id} 
                chatbot={chatbot} 
                onEdit={handleOpenEditModal}
              />
            ))}
          </div>
        ) : (
          <div className="bg-background-light border border-neutral-800 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-2">No Chatbots Yet</h3>
              <p className="text-neutral-400 mb-6">
                Create your first chatbot to start building conversational AI with document-based knowledge.
              </p>
              <Button className="bg-primary hover:bg-primary-dark text-white" onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Chatbot
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
