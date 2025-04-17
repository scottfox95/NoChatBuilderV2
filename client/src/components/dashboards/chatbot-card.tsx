import { Edit, Trash2, ExternalLink, Eye, Copy, Share2 } from "lucide-react";
import { Chatbot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useDuplicateChatbot } from "@/hooks/use-chatbots";
import ShareEmbedModal from "@/components/modals/share-embed-modal";

interface ChatbotCardProps {
  chatbot: Chatbot;
  onEdit: (id: number) => void;
}

export default function ChatbotCard({ chatbot, onEdit }: ChatbotCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const duplicateMutation = useDuplicateChatbot();

  const handleDuplicate = async () => {
    try {
      await duplicateMutation.mutateAsync(chatbot.id);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chatbots/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Chatbot deleted",
        description: "The chatbot has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(chatbot.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  return (
    <>
      <Card className="bg-background-light border-neutral-800 hover:shadow-lg transition-shadow">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-white">{chatbot.name}</h2>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowShareModal(true)} 
                className="text-neutral-400 hover:text-green-500"
                title="Share chatbot"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleDuplicate} 
                className="text-neutral-400 hover:text-primary"
                disabled={duplicateMutation.isPending}
                title="Duplicate chatbot"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(chatbot.id)} 
                className="text-neutral-400 hover:text-white"
                title="Edit chatbot"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDeleteConfirm(true)} 
                className="text-neutral-400 hover:text-red-500"
                title="Delete chatbot"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
            {chatbot.description}
          </p>
          <div className="flex items-center text-xs text-neutral-500 mb-4">
            <div className="flex items-center mr-4">
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{chatbot.model}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Documents</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            <div className="flex items-center text-xs text-neutral-500">
              <Eye className="h-3 w-3 mr-1" />
              <span>{chatbot.views} views</span>
            </div>
            <div>
              <Button 
                variant="link" 
                className="text-primary hover:text-primary-light text-sm font-medium p-0"
                onClick={() => navigate(`/care-aid/${chatbot.slug}`)}
              >
                View Care Aid <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the Care Aid
              "{chatbot.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareEmbedModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chatbotSlug={chatbot.slug}
      />
    </>
  );
}
