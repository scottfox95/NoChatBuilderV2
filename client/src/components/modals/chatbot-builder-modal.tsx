import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import ChatbotFormWithPreview from "./chatbot-form-with-preview";

interface ChatbotBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId?: number | null;
}

export default function ChatbotBuilderModal({ isOpen, onClose, chatbotId }: ChatbotBuilderModalProps) {
  const isEditMode = !!chatbotId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-background-light border-neutral-800 [&>button]:hidden">
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
          <ChatbotFormWithPreview 
            chatbotId={chatbotId} 
            onSuccess={() => {
              console.log("Chatbot form success - closing modal");
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
