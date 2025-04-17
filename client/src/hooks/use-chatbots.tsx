import { useQuery, useMutation } from "@tanstack/react-query";
import { Chatbot, insertChatbotSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useChatbots() {
  const { data: chatbots, isLoading, error } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  return { chatbots, isLoading, error };
}

export function useChatbot(id: number | null) {
  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${id}`],
    enabled: !!id,
  });

  return { chatbot, isLoading, error };
}

export function useChatbotBySlug(slug: string) {
  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/public/chatbot/${slug}`],
    enabled: !!slug,
  });

  return { chatbot, isLoading, error };
}

export function useCreateChatbot() {
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertChatbotSchema>) => {
      const response = await apiRequest("POST", "/api/chatbots", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chatbot created",
        description: "Your chatbot has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return createMutation;
}

export function useUpdateChatbot() {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof insertChatbotSchema>> }) => {
      const response = await apiRequest("PUT", `/api/chatbots/${id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Chatbot updated",
        description: "Your chatbot has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${data.id}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return updateMutation;
}

export function useDeleteChatbot() {
  const { toast } = useToast();

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

  return deleteMutation;
}

export function useDuplicateChatbot() {
  const { toast } = useToast();

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/chatbots/${id}/duplicate`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Chatbot duplicated",
        description: "The chatbot has been duplicated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to duplicate chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return duplicateMutation;
}
