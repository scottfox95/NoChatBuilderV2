import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader } from "@/components/ui/loader";
import { insertChatbotSchema, behaviorRuleSchema, type Chatbot } from "@shared/schema";
import FormTabs from "@/components/forms/chatbot-form/form-tabs";
import ChatbotPreviewWrapper from "./chatbot-preview-wrapper";

const formSchema = insertChatbotSchema.extend({
  id: z.number().optional(),
  behaviorRules: z.array(behaviorRuleSchema).default([]),
  welcomeMessages: z.array(z.string()).default(["Hello! How can I assist you today?"]),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatbotFormWithPreviewProps {
  chatbotId?: number | null;
  onSuccess?: () => void;
}

export default function ChatbotFormWithPreview({ chatbotId, onSuccess }: ChatbotFormWithPreviewProps) {
  const { toast } = useToast();
  const [isEditMode] = useState(!!chatbotId);

  // Fetch chatbot data if editing
  const { data: chatbotData, isLoading: isLoadingChatbot } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  const defaultValues = {
    name: "My Chatbot",
    description: "A helpful assistant for my users",
    slug: "my-chatbot-" + Date.now().toString().slice(-4),
    systemPrompt: "You are a helpful AI assistant that provides accurate and concise information.",
    model: "gpt-3.5-turbo",
    temperature: 70,
    maxTokens: 500,
    ragEnabled: true,
    behaviorRules: [],
    fallbackResponse: "I'm sorry, I don't have enough information to answer that question.",
    welcomeMessage: "Hello! How can I assist you today?",
    welcomeMessages: ["Hello! How can I assist you today?"],
    suggestedQuestions: [],
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Set form values when chatbot data is loaded
  useEffect(() => {
    if (chatbotData) {
      form.reset({
        id: chatbotData.id,
        name: chatbotData.name,
        description: chatbotData.description,
        slug: chatbotData.slug,
        systemPrompt: chatbotData.systemPrompt,
        model: chatbotData.model,
        temperature: chatbotData.temperature,
        maxTokens: chatbotData.maxTokens,
        ragEnabled: chatbotData.ragEnabled,
        behaviorRules: chatbotData.behaviorRules as z.infer<typeof behaviorRuleSchema>[],
        fallbackResponse: chatbotData.fallbackResponse || "",
        welcomeMessage: chatbotData.welcomeMessage || "Hello! How can I assist you today?",
        welcomeMessages: chatbotData.welcomeMessages || [chatbotData.welcomeMessage || "Hello! How can I assist you today?"],
        suggestedQuestions: chatbotData.suggestedQuestions || [],
      });
    }
  }, [chatbotData, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/chatbots", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chatbot created",
        description: "Your chatbot has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const { id, ...updateData } = data;
      const response = await apiRequest("PUT", `/api/chatbots/${chatbotId}`, updateData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chatbot updated",
        description: "Your chatbot has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update chatbot: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleSaveChatbot = () => {
    try {
      const values = form.getValues();
      console.log("Submitting form with data:", values);
      
      if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
        console.error("Form validation errors:", form.formState.errors);
        toast({
          title: "Validation Error",
          description: "Please fill out all required fields correctly",
          variant: "destructive",
        });
        return;
      }
      
      if (isEditMode) {
        updateMutation.mutate(values);
      } else {
        createMutation.mutate(values);
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoadingChatbot && isEditMode) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader size="lg" withText text="Loading chatbot data..." />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row h-full">
        {/* Builder Form Section */}
        <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <FormTabs 
              onSubmit={handleSaveChatbot} 
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
        
        {/* Preview Section */}
        <div className="w-full md:w-1/2 bg-background border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="font-medium text-white">Live Preview</h3>
            <p className="text-xs text-neutral-400 mt-1">Preview updates automatically as you edit</p>
          </div>
          
          {/* Chat Preview */}
          <div className="flex-1 overflow-hidden">
            <ChatbotPreviewWrapper />
          </div>
        </div>
      </form>
    </Form>
  );
}