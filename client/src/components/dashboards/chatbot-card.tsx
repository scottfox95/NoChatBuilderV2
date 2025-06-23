import { Edit, Trash2, ExternalLink, Eye, Copy, Share2, MoreVertical, Zap } from "lucide-react";
import { Chatbot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useDuplicateChatbot } from "@/hooks/use-chatbots";
import ShareEmbedModal from "@/components/modals/share-embed-modal";
import { getModelDisplayName } from "@/lib/utils";

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
      <Card className="group hover:shadow-md transition-all duration-200 bg-white border border-slate-200 hover:border-slate-300">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 truncate mb-1">
                {chatbot.name}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs font-medium">
                  <Zap className="h-3 w-3 mr-1" />
                  {getModelDisplayName(chatbot.model)}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium">
                  ID: {chatbot.id}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share & Embed
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDuplicate}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(chatbot.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {chatbot.description || "No description provided"}
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center text-sm text-slate-500">
              <Eye className="h-4 w-4 mr-1" />
              <span>{chatbot.views.toLocaleString()} views</span>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium opacity-100"
              onClick={() => window.open(`/care-aid/${chatbot.slug}`, '_blank')}
            >
              View Care Aid
            </Button>
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
        careAidSlug={chatbot.slug}
      />
    </>
  );
}
