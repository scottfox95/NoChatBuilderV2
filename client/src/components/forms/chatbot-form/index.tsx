import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/loader";
import FormTabs from "./form-tabs";
import { Chatbot, insertChatbotSchema, behaviorRuleSchema } from "@shared/schema";

interface ChatbotFormProps {
  chatbotId?: number | null;
  onSuccess?: () => void;
}

// Extended schema with validation
const formSchema = insertChatbotSchema.extend({
  id: z.number().optional(),
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters" })
    .regex(/^[a-z0-9-]+$/, { message: "Slug can only contain lowercase letters, numbers, and hyphens" }),
  systemPrompt: z.string().min(10, { message: "System prompt must be at least 10 characters" }),
  behaviorRules: z.array(behaviorRuleSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function ChatbotForm({ chatbotId, onSuccess }: ChatbotFormProps) {
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
    slug: "my-chatbot-" + Date.now().toString().slice(-4), // Generate unique slug with timestamp
    systemPrompt: "You are a helpful AI assistant that provides accurate and concise information.",
    model: "gpt35turbo",
    temperature: 70,
    maxTokens: 500,
    ragEnabled: true,
    behaviorRules: [],
    fallbackResponse: "I'm sorry, I don't have enough information to answer that question.",
    welcomeMessage: "Hello! How can I assist you today?",
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
        suggestedQuestions: chatbotData.suggestedQuestions || [],
      });
    }
  }, [chatbotData, form]);

  // Direct API mutation for more control
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // For create, we don't need to explicitly set the userId in the client
      // The server will get it from the authenticated session
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
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <FormTabs 
          onSubmit={handleSaveChatbot} 
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </form>
    </Form>
  );
}
