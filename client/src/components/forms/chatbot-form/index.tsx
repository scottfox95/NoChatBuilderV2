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
      });
    }
  }, [chatbotData, form]);

  // Direct API mutation for more control
  const handleSaveChatbot = async () => {
    const formData = form.getValues();
    console.log("Submitting form with data:", formData);
    
    // Validate form data
    try {
      const validatedData = formSchema.parse(formData);
      console.log("Data validated:", validatedData);
      
      try {
        // Set loading state
        form.formState.isSubmitting = true;
        
        if (isEditMode) {
          // Update existing chatbot
          const { id, ...updateData } = validatedData;
          const response = await fetch(`/api/chatbots/${chatbotId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
            credentials: "include"
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(errorData.message || `Error ${response.status}`);
          }
          
          toast({
            title: "Chatbot updated",
            description: "Your chatbot has been updated successfully.",
          });
        } else {
          // Create new chatbot
          console.log("Creating new chatbot with data:", validatedData);
          const response = await fetch("/api/chatbots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validatedData),
            credentials: "include"
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(errorData.message || `Error ${response.status}`);
          }
          
          toast({
            title: "Chatbot created",
            description: "Your chatbot has been created successfully.",
          });
        }
        
        // Invalidate queries and call onSuccess
        queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
        if (chatbotId) {
          queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
        }
        if (onSuccess) onSuccess();
      } catch (error) {
        console.error("API error:", error);
        toast({
          title: "Error",
          description: `Failed to save chatbot: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        form.formState.isSubmitting = false;
      }
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => `${err.path}: ${err.message}`).join(", ");
        toast({
          title: "Validation Error",
          description: `Please check the form: ${fieldErrors}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
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
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
