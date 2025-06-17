import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ChatbotForm from "@/components/forms/chatbot-form";
import ChatbotPreviewWrapper from "./chatbot-preview-wrapper";

interface ChatbotBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId?: number | null;
}

export default function ChatbotBuilderModal({ isOpen, onClose, chatbotId }: ChatbotBuilderModalProps) {
  const isEditMode = !!chatbotId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-background-light border-neutral-800">
        <DialogHeader className="p-6 border-b border-neutral-800">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-white">
              {isEditMode ? "Edit Chatbot" : "Create New Chatbot"}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* Builder Form Section */}
          <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <ChatbotForm 
                chatbotId={chatbotId} 
                onSuccess={() => {
                  // Only close modal when chatbot itself is saved, not on file uploads
                  console.log("Chatbot form success - closing modal");
                  onClose();
                }}
              />
            </div>
          </div>
          
          {/* Preview Section */}
          <div className="w-full md:w-1/2 bg-background border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="font-medium text-white">Live Preview</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshPreview}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-transparent"
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Refresh
              </Button>
            </div>
            
            {/* Chat Preview */}
            <div className="flex-1 overflow-hidden" key={previewKey}>
              <ChatbotPreviewWrapper />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
